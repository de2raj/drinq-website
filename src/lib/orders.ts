import "server-only";
import { randomBytes } from "node:crypto";
import { productById } from "./catalogue";
import { db } from "./db";
import { arrival, feeFor } from "./delivery";
import { currentCustomer, customerFor } from "./customers";
import { awardPoints, maxUsable, pointsOf, pointsValue, reversePoints } from "./loyalty";
import { getSetting } from "./settings";
import { createCheckoutSession, stripeEnabled } from "./stripe";

export type CheckoutInput = {
  lines: { id: string; qty: number }[];
  name: string; email: string; phone: string;
  address: string; unit: string; postal: string;
  method: string; date: string; slot: string; notes: string;
  points: number; // loyalty points to use (signed-in customers)
  payment: string;
  over18: boolean;
};
type Field = keyof CheckoutInput | "form";

export type CheckoutResult =
  | { ok: true; redirect: string }
  | { ok: false; errors: Partial<Record<Field, string>> };

const clean = (s: unknown, max = 200) => String(s ?? "").trim().slice(0, max);

export async function placeOrder(input: CheckoutInput, siteUrl: string): Promise<CheckoutResult> {
  const errors: Partial<Record<Field, string>> = {};
  const [methods, payments] = await Promise.all([getSetting("delivery"), getSetting("payments")]);

  const name = clean(input.name, 100);
  const email = clean(input.email, 150).toLowerCase();
  const phone = clean(input.phone, 30).replace(/[\s-]/g, "");
  const notes = clean(input.notes, 500);
  const method = methods.find((m) => m.id === input.method && m.enabled);
  const collect = method?.id === "COLLECT";
  const address = collect ? "" : clean(input.address, 200);
  const unit = collect ? "" : clean(input.unit, 40);
  const postal = collect ? "" : clean(input.postal, 10);

  if (!name) errors.name = "Please enter your name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Please enter a valid email.";
  if (!/^(\+?65)?[3689]\d{7}$/.test(phone)) errors.phone = "Please enter a Singapore phone number (8 digits).";
  if (!method) errors.method = "Please choose a delivery option.";
  if (!collect) {
    if (!address) errors.address = "Please enter your street address.";
    if (!/^\d{6}$/.test(postal)) errors.postal = "Singapore postal codes have 6 digits.";
  }
  // Work out the delivery date / slot again on the server, from the rules as they are right now.
  let date = "", slotText = "";
  if (method) {
    const a = arrival(method);
    if (a.pick === "none") { date = a.date; slotText = a.slotText; }
    else {
      const d = a.dates.find((x) => x.date === input.date);
      if (!d) errors.date = "Please choose a date.";
      else if (a.pick === "date") { date = d.date; slotText = d.detail; }
      else {
        const t = d.slots?.find((x) => x.id === input.slot);
        if (!t) errors.slot = "That time slot is no longer available. Please choose another.";
        else { date = d.date; slotText = t.label; }
      }
    }
  }
  const payment = payments.options.find((p) => p.id === input.payment && p.enabled);
  if (!payment) errors.payment = "Please choose a payment method.";
  if (!input.over18) errors.over18 = "You must be 18 or over to buy alcohol.";

  // Re-price every line from the catalogue: never trust prices sent by the browser.
  const lines: { productId: string; sku: string; name: string; size: string; unitPrice: number; qty: number; lineTotal: number }[] = [];
  for (const l of input.lines ?? []) {
    const p = await productById(String(l.id));
    const qty = Math.floor(Number(l.qty));
    if (!p || !(qty >= 1 && qty <= 99)) continue;
    if (!p.inStock) { errors.form = `${p.name} has just sold out. Please remove it from your cart.`; continue; }
    lines.push({ productId: p.id, sku: p.sku, name: p.name, size: p.size, unitPrice: p.price, qty, lineTotal: p.price * qty });
  }
  if (!lines.length && !errors.form) errors.form = "Your cart is empty.";
  if (Object.keys(errors).length || !method || !payment) return { ok: false, errors };

  const subtotal = lines.reduce((a, l) => a + l.lineTotal, 0);
  const fee = feeFor(method, subtotal); // free delivery goes by the product total before points

  // Loyalty points: only for a signed-in customer, in whole blocks, never more than they have.
  const [member, loyalty] = await Promise.all([currentCustomer(), getSetting("loyalty")]);
  let pointsUsed = 0;
  const want = Math.max(0, Math.floor(Number(input.points) || 0));
  if (want && member && loyalty.enabled) {
    const usable = maxUsable((await pointsOf(member.id)).balance, subtotal, loyalty);
    pointsUsed = Math.min(Math.floor(want / loyalty.block) * loyalty.block, usable);
    if (pointsUsed < Math.floor(want / loyalty.block) * loyalty.block) return { ok: false, errors: { points: "You don't have that many points available any more. Please check and try again." } };
  }
  const pointsDiscount = pointsValue(pointsUsed, loyalty);
  const customerId = member?.id ?? await customerFor({ email, phone, name, address, unit, postal });
  const token = randomBytes(16).toString("hex");
  const isTest = payments.testMode || !!process.env.STAGING_PASSWORD;

  const order = await db.$transaction(async (tx) => {
    const c = await tx.counter.upsert({ where: { name: "order" }, create: { name: "order", value: 1 }, update: { value: { increment: 1 } } });
    return tx.order.create({
      data: {
        number: "DQW-" + String(c.value).padStart(5, "0"), token, paymentMethod: payment.id, isTest,
        name, email, phone, address, unit, postal, notes,
        deliveryMethod: method.id, deliveryLabel: method.name, deliveryDate: date, deliverySlot: slotText,
        subtotal, deliveryFee: fee, total: subtotal - pointsDiscount + fee,
        customerId, pointsUsed, pointsDiscount,
        lines: { create: lines },
        events: { create: { status: "AWAITING_PAYMENT", note: "Order placed" } },
      },
    });
  });

  if (pointsUsed && customerId) {
    await db.pointsEntry.create({ data: { customerId, orderId: order.id, change: -pointsUsed, reason: `Used on ${order.number}` } });
  }

  // Real card payments only when a payment gateway is set up and test mode is off.
  // (Orders paid partly with points are paid on the order page until the gateway supports discounts.)
  if (!isTest && !pointsDiscount && payment.id !== "PAYNOW" && stripeEnabled()) {
    try {
      const s = await createCheckoutSession({ number: order.number, token, email, lines, deliveryFee: fee, siteUrl });
      await db.order.update({ where: { id: order.id }, data: { stripeSessionId: s.id } });
      return { ok: true, redirect: s.url };
    } catch (e) {
      console.error("Card checkout failed", e);
    }
  }
  return { ok: true, redirect: `/order/${token}` };
}

/** Moves an order to a new status and records it on the timeline. */
export async function setStatus(orderId: number, status: string, note = "") {
  const before = await db.order.findUnique({ where: { id: orderId }, select: { status: true } });
  if (!before) return;
  await db.order.update({
    where: { id: orderId },
    data: {
      status,
      ...(status === "PAID" ? { paidAt: new Date() } : {}),
      events: { create: { status, note: note || null } },
    },
  });
  // Loyalty: points are given once paid, and undone if the order is cancelled.
  if (status === "PAID") await awardPoints(orderId);
  if (status === "CANCELLED" && before.status !== "CANCELLED") await reversePoints(orderId);
}

export async function markPaid(number: string, sessionId: string) {
  const o = await db.order.findFirst({ where: { number, stripeSessionId: sessionId, status: "AWAITING_PAYMENT" } });
  if (o) await setStatus(o.id, "PAID", "Card payment received");
}

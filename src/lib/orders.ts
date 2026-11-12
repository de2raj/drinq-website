import "server-only";
import { randomBytes } from "node:crypto";
import { db } from "./db";
import { productById } from "./catalogue";
import { deliveryFee, isBookable } from "./delivery";
import { createCheckoutSession, stripeEnabled } from "./stripe";

export type CheckoutInput = {
  lines: { id: string; qty: number }[];
  name: string; email: string; phone: string;
  address: string; unit: string; postal: string;
  date: string; slot: string; notes: string;
  payment: "PAYNOW" | "CARD";
  over18: boolean;
};

export type CheckoutResult =
  | { ok: true; redirect: string }
  | { ok: false; errors: Partial<Record<keyof CheckoutInput | "form", string>>; changed?: boolean };

const clean = (s: unknown, max = 200) => String(s ?? "").trim().slice(0, max);

export async function placeOrder(input: CheckoutInput, siteUrl: string): Promise<CheckoutResult> {
  const errors: Partial<Record<keyof CheckoutInput | "form", string>> = {};
  const name = clean(input.name, 100);
  const email = clean(input.email, 150).toLowerCase();
  const phone = clean(input.phone, 30).replace(/[\s-]/g, "");
  const address = clean(input.address, 200);
  const unit = clean(input.unit, 40);
  const postal = clean(input.postal, 10);
  const notes = clean(input.notes, 500);

  if (!name) errors.name = "Please enter your name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Please enter a valid email.";
  if (!/^(\+?65)?[3689]\d{7}$/.test(phone)) errors.phone = "Please enter a Singapore phone number (8 digits).";
  if (!address) errors.address = "Please enter your street address.";
  if (!/^\d{6}$/.test(postal)) errors.postal = "Singapore postal codes have 6 digits.";
  if (!isBookable(input.date, input.slot)) errors.slot = "That delivery slot is no longer available. Please pick another.";
  if (!input.over18) errors.over18 = "You must be 18 or over to buy alcohol.";
  const payment = input.payment === "CARD" && stripeEnabled() ? "CARD" : "PAYNOW";

  // Re-price every line from the catalogue: never trust prices sent by the browser.
  const lines: { productId: string; sku: string; name: string; size: string; unitPrice: number; qty: number; lineTotal: number }[] = [];
  for (const l of input.lines ?? []) {
    const p = productById(String(l.id));
    const qty = Math.floor(Number(l.qty));
    if (!p || !(qty >= 1 && qty <= 99)) continue;
    if (!p.inStock) { errors.form = `${p.name} has just sold out. Please remove it from your cart.`; continue; }
    lines.push({ productId: p.id, sku: p.sku, name: p.name, size: p.size, unitPrice: p.price, qty, lineTotal: p.price * qty });
  }
  if (!lines.length && !errors.form) errors.form = "Your cart is empty.";
  if (Object.keys(errors).length) return { ok: false, errors };

  const subtotal = lines.reduce((a, l) => a + l.lineTotal, 0);
  const fee = deliveryFee(subtotal);
  const token = randomBytes(16).toString("hex");

  const order = await db.$transaction(async (tx) => {
    const c = await tx.counter.upsert({ where: { name: "order" }, create: { name: "order", value: 1 }, update: { value: { increment: 1 } } });
    return tx.order.create({
      data: {
        number: "DQW-" + String(c.value).padStart(5, "0"), token, paymentMethod: payment,
        name, email, phone, address, unit, postal, deliveryDate: input.date, deliverySlot: input.slot, notes,
        subtotal, deliveryFee: fee, total: subtotal + fee,
        lines: { create: lines },
      },
    });
  });

  if (payment === "CARD") {
    try {
      const s = await createCheckoutSession({ number: order.number, token, email, lines, deliveryFee: fee, siteUrl });
      await db.order.update({ where: { id: order.id }, data: { stripeSessionId: s.id } });
      return { ok: true, redirect: s.url };
    } catch (e) {
      console.error("Stripe checkout failed", e);
      // Order is kept; the customer can still pay by PayNow from the order page.
      await db.order.update({ where: { id: order.id }, data: { paymentMethod: "PAYNOW" } });
    }
  }
  return { ok: true, redirect: `/order/${token}` };
}

export async function markPaid(number: string, sessionId: string) {
  await db.order.updateMany({
    where: { number, stripeSessionId: sessionId, status: "AWAITING_PAYMENT" },
    data: { status: "PAID", paidAt: new Date() },
  });
}

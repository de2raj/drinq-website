import "server-only";
import { randomBytes } from "node:crypto";
import { everyProduct } from "./catalogue";
import { db } from "./db";
import { customerFor } from "./customers";
import { awardPoints } from "./loyalty";
import { getSetting } from "./settings";

/** An order typed in by staff (walk-in, phone or Telegram customers), or an existing order being edited. */
export type StaffOrderInput = {
  id?: number;
  name: string; email: string; phone: string;
  address: string; unit: string; postal: string; notes: string;
  method: string; date: string; slot: string;
  payment: string;
  lines: { productId: string; name: string; qty: number; unitPrice: number }[];
  deliveryFee: number; // cents
  paid: boolean; // new orders only: already paid in store
};
export type StaffOrderResult = { ok: true; id: number } | { ok: false; errors: Record<string, string> };

const clean = (s: unknown, max = 200) => String(s ?? "").trim().slice(0, max);
const cents = (n: unknown) => Math.max(0, Math.round(Number(n) || 0));

export async function saveStaffOrder(input: StaffOrderInput): Promise<StaffOrderResult> {
  const errors: Record<string, string> = {};
  const [methods, payments, products] = await Promise.all([getSetting("delivery"), getSetting("payments"), everyProduct()]);
  const method = methods.find((m) => m.id === input.method);
  const collect = method?.id === "COLLECT";
  const name = clean(input.name, 100);
  const email = clean(input.email, 150).toLowerCase();
  const phone = clean(input.phone, 30).replace(/[\s-]/g, "");
  const address = collect ? "" : clean(input.address, 200);
  const unit = collect ? "" : clean(input.unit, 40);
  const postal = collect ? "" : clean(input.postal, 10);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(input.date) ? input.date : "";
  const payment = payments.options.find((p) => p.id === input.payment);

  if (!name) errors.name = "Enter the customer's name.";
  if (!phone) errors.phone = "Enter a phone number.";
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "That email doesn't look right.";
  if (!method) errors.method = "Choose a delivery option.";
  if (method && !collect) {
    if (!address) errors.address = "Enter the street address.";
    if (!/^\d{6}$/.test(postal)) errors.postal = "Postal codes have 6 digits.";
  }
  if (!date) errors.date = "Choose a date.";
  if (!payment) errors.payment = "Choose a payment method.";

  const lines: { productId: string; sku: string; name: string; size: string; unitPrice: number; qty: number; lineTotal: number }[] = [];
  for (const l of input.lines ?? []) {
    const qty = Math.floor(Number(l.qty));
    if (!(qty >= 1 && qty <= 999)) continue;
    const p = products.find((x) => x.id === String(l.productId));
    const unitPrice = cents(l.unitPrice);
    lines.push({ productId: String(l.productId), sku: p?.sku ?? "", name: clean(p?.name ?? l.name, 200), size: p?.size ?? "", unitPrice, qty, lineTotal: unitPrice * qty });
  }
  if (!lines.length) errors.lines = "Add at least one product.";
  if (Object.keys(errors).length || !method || !payment) return { ok: false, errors };

  const subtotal = lines.reduce((a, l) => a + l.lineTotal, 0);
  const deliveryFee = cents(input.deliveryFee);
  const data = {
    name, email, phone, address, unit, postal, notes: clean(input.notes, 500),
    deliveryMethod: method.id, deliveryLabel: method.name, deliveryDate: date, deliverySlot: clean(input.slot, 60),
    paymentMethod: payment.id, subtotal, deliveryFee, total: subtotal + deliveryFee,
  };

  const customerId = await customerFor({ email, phone, name, address, unit, postal });
  if (input.id) {
    const old = await db.order.findUnique({ where: { id: input.id }, select: { id: true, total: true, pointsDiscount: true } });
    if (!old) return { ok: false, errors: { form: "That order no longer exists." } };
    data.total = Math.max(0, data.total - old.pointsDiscount); // points already taken off stay off
    await db.$transaction([
      db.orderLine.deleteMany({ where: { orderId: old.id } }),
      db.order.update({
        where: { id: old.id },
        data: { ...data, customerId, lines: { create: lines }, events: { create: { status: "EDITED", note: `Order edited by staff${old.total !== data.total ? ` · total ${(old.total / 100).toFixed(2)} → ${(data.total / 100).toFixed(2)}` : ""}` } } },
      }),
    ]);
    return { ok: true, id: old.id };
  }

  const isTest = payments.testMode || !!process.env.STAGING_PASSWORD;
  const order = await db.$transaction(async (tx) => {
    const c = await tx.counter.upsert({ where: { name: "order" }, create: { name: "order", value: 1 }, update: { value: { increment: 1 } } });
    return tx.order.create({
      data: {
        ...data, customerId, number: "DQW-" + String(c.value).padStart(5, "0"), token: randomBytes(16).toString("hex"), isTest,
        status: input.paid ? "PAID" : "AWAITING_PAYMENT", paidAt: input.paid ? new Date() : null,
        lines: { create: lines },
        events: { create: [{ status: "AWAITING_PAYMENT", note: "Order placed by staff" }, ...(input.paid ? [{ status: "PAID", note: `Paid in store (${payment.name})` }] : [])] },
      },
    });
  });
  if (input.paid) await awardPoints(order.id);
  return { ok: true, id: order.id };
}

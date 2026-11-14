import "server-only";
import { db } from "./db";
import { getSetting, type LoyaltySettings } from "./settings";

type Entry = { change: number; expiresAt: Date | null; createdAt: Date };

/**
 * What's left of the points: earned points are used oldest first, and whatever is unused
 * when they expire is gone. Returns the balance and the next batch that will expire.
 */
export function summarise(entries: Entry[], now = new Date()) {
  const lots: { left: number; exp: Date | null }[] = [];
  const sorted = [...entries].sort((a, b) => +a.createdAt - +b.createdAt);
  for (const e of sorted) {
    if (e.change > 0) { lots.push({ left: e.change, exp: e.expiresAt }); continue; }
    let take = -e.change;
    for (const l of lots) {
      if (!take) break;
      if (l.exp && l.exp <= e.createdAt) continue; // already expired when this was used
      const n = Math.min(l.left, take);
      l.left -= n; take -= n;
    }
  }
  const live = lots.filter((l) => l.left > 0 && (!l.exp || l.exp > now));
  const balance = live.reduce((a, l) => a + l.left, 0);
  const soon = live.filter((l) => l.exp).sort((a, b) => +a.exp! - +b.exp!)[0];
  return { balance, expiring: soon ? { points: soon.left, date: soon.exp! } : null };
}

export async function pointsOf(customerId: number) {
  const entries = await db.pointsEntry.findMany({ where: { customerId }, select: { change: true, expiresAt: true, createdAt: true } });
  return summarise(entries);
}

/** Cents off for a number of points, and the most points usable on a subtotal. */
export const pointsValue = (points: number, l: LoyaltySettings) => Math.floor(points / l.block) * l.blockValue;
export const maxUsable = (balance: number, subtotal: number, l: LoyaltySettings) =>
  Math.min(Math.floor(balance / l.block), Math.floor(subtotal / l.blockValue)) * l.block;
export const pointsFor = (cents: number, l: LoyaltySettings) => Math.max(0, Math.floor((cents / 100) * l.earnPerDollar));

const expiry = (l: LoyaltySettings, from = new Date()) => {
  if (!l.expiryMonths) return null;
  const d = new Date(from);
  d.setMonth(d.getMonth() + l.expiryMonths);
  return d;
};

/** When an order is paid: give its points (once). */
export async function awardPoints(orderId: number) {
  const l = await getSetting("loyalty");
  const o = await db.order.findUnique({ where: { id: orderId }, select: { id: true, number: true, customerId: true, subtotal: true, pointsDiscount: true, pointsEarned: true } });
  if (!l.enabled || !o?.customerId || o.pointsEarned) return;
  const pts = pointsFor(o.subtotal - o.pointsDiscount, l);
  if (!pts) return;
  await db.$transaction([
    db.pointsEntry.create({ data: { customerId: o.customerId, orderId: o.id, change: pts, reason: `Earned on ${o.number}`, expiresAt: expiry(l) } }),
    db.order.update({ where: { id: o.id }, data: { pointsEarned: pts } }),
  ]);
}

/** When an order is cancelled: take back points it earned and give back points it used. */
export async function reversePoints(orderId: number) {
  const l = await getSetting("loyalty");
  const o = await db.order.findUnique({ where: { id: orderId }, select: { id: true, number: true, customerId: true, pointsUsed: true, pointsEarned: true } });
  if (!o?.customerId) return;
  const ops = [];
  if (o.pointsEarned) ops.push(db.pointsEntry.create({ data: { customerId: o.customerId, orderId: o.id, change: -o.pointsEarned, reason: `${o.number} cancelled: earned points taken back` } }));
  if (o.pointsUsed) ops.push(db.pointsEntry.create({ data: { customerId: o.customerId, orderId: o.id, change: o.pointsUsed, reason: `${o.number} cancelled: points given back`, expiresAt: expiry(l) } }));
  if (!ops.length) return;
  ops.push(db.order.update({ where: { id: o.id }, data: { pointsEarned: 0 } }));
  await db.$transaction(ops);
}

/** Staff add or remove points by hand. */
export async function adjustPoints(customerId: number, change: number, reason: string) {
  const l = await getSetting("loyalty");
  await db.pointsEntry.create({ data: { customerId, change, reason: reason || (change > 0 ? "Added by staff" : "Removed by staff"), by: "staff", expiresAt: change > 0 ? expiry(l) : null } });
}

export { expiry as pointsExpiry };

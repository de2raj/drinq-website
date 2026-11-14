import type { DeliveryMethod, Weekday } from "./settings";

/** Delivery rules shared by the checkout (browser) and the server. Singapore is UTC+8, no daylight saving. */
const SG = 8 * 3600_000;
const KEYS: Weekday[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
export const sgNow = (now = Date.now()) => new Date(now + SG); // read with getUTC*
const hm = (d: Date) => `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
const ymd = (d: Date) => d.toISOString().slice(0, 10);

export type MethodState = { method: DeliveryMethod; open: boolean; reason: string; fee: number; dates: { date: string; label: string }[] };

/** Can this option be ordered right now? */
export function isOpen(m: DeliveryMethod, now = Date.now()) {
  if (!m.enabled) return false;
  const d = sgNow(now);
  const w = m.windows[KEYS[d.getUTCDay()]];
  const t = hm(d);
  return !!w?.on && t >= w.from && t <= w.to;
}

/** Dates a customer can pick for an option: only days it is serviced (e.g. Mon–Sat). */
export function pickDates(m: DeliveryMethod, now = Date.now(), count = 14) {
  if (!m.pickDate) return [];
  const today = sgNow(now);
  const out: { date: string; label: string }[] = [];
  const service = m.serviceDays ?? { mon: true, tue: true, wed: true, thu: true, fri: true, sat: true, sun: false };
  for (let i = m.firstDay; out.length < count && i < count + 10; i++) {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + i));
    if (!service[KEYS[d.getUTCDay()]]) continue;
    if (i === 0 && hm(today) > (m.todayUntil || "23:59")) continue; // too late for today
    const dm = d.toLocaleDateString("en-SG", { day: "numeric", month: "short", timeZone: "UTC" });
    const wd = d.toLocaleDateString("en-SG", { weekday: "short", timeZone: "UTC" });
    out.push({ date: ymd(d), label: i === 0 ? `Today|${dm}` : i === 1 ? `Tomorrow|${dm}` : `${wd}|${dm}` });
  }
  return out;
}

export const feeFor = (m: DeliveryMethod, subtotal: number) => (m.freeFrom > 0 && subtotal >= m.freeFrom ? 0 : m.fee);

export function methodStates(methods: DeliveryMethod[], subtotal: number, now = Date.now()): MethodState[] {
  return methods.filter((m) => m.enabled).map((m) => {
    const open = isOpen(m, now);
    return { method: m, open, reason: open ? "" : m.closedMessage, fee: feeFor(m, subtotal), dates: pickDates(m, now) };
  });
}

/** The date an order is for: the chosen date, or today for same-day / express. */
export const todaySG = (now = Date.now()) => ymd(sgNow(now));

export function dayLabel(date: string) {
  if (!date) return "";
  return new Date(date + "T00:00:00Z").toLocaleDateString("en-SG", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
}

/** "23:59" → "11:59PM", "11:00" → "11AM". */
export function clock(t: string) {
  const [h, m] = t.split(":").map(Number);
  const ap = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return m ? `${h12}:${String(m).padStart(2, "0")}${ap}` : `${h12}${ap}`;
}

const DAY_NAMES: Record<Weekday, string> = { sun: "Sundays", mon: "Mondays", tue: "Tuesdays", wed: "Wednesdays", thu: "Thursdays", fri: "Fridays", sat: "Saturdays" };

/**
 * The homepage badge: what a customer can get right now (Singapore time).
 * Same day first, then Express, then Next day; on a closed day it says so.
 */
export function deliveryHeadline(methods: DeliveryMethod[], now = Date.now()): { text: string; open: boolean } {
  const d = sgNow(now);
  const today = KEYS[d.getUTCDay()];
  const tomorrow = KEYS[(d.getUTCDay() + 1) % 7];
  const by = (id: DeliveryMethod["id"]) => methods.find((m) => m.id === id && m.enabled);
  const same = by("SAME_DAY"), express = by("EXPRESS"), next = by("NEXT_DAY"), collect = by("COLLECT");

  if (same && isOpen(same, now)) return { text: `Same-day delivery · order by ${clock(same.windows[today].to)}`, open: true };
  if (express && isOpen(express, now)) {
    let end = express.windows[today].to;
    // A window running to midnight that carries on early next morning ends at the next morning's time.
    const t = express.windows[tomorrow];
    if (end >= "23:59" && t.on && t.from === "00:00") end = t.to;
    return { text: `Express delivery · order by ${clock(end)}`, open: true };
  }
  // A day we don't deliver or hand over is a closed day (orders can still be placed for later).
  const closedDay = [next, same, collect].every((m) => !m || !m.serviceDays?.[today]);
  if (next && isOpen(next, now)) {
    const by = `order by ${clock(next.windows[today].to)}`;
    return closedDay ? { text: `Closed on ${DAY_NAMES[today]} · Next-day delivery, ${by}`, open: false } : { text: `Next-day delivery · ${by}`, open: true };
  }
  return { text: closedDay ? `Closed on ${DAY_NAMES[today]}` : "Order now for next-day delivery", open: false };
}

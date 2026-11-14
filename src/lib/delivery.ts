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

/** Dates a customer can pick for an option (Sundays excluded when it's closed on Sundays). */
export function pickDates(m: DeliveryMethod, now = Date.now(), count = 14) {
  if (!m.pickDate) return [];
  const today = sgNow(now);
  const out: { date: string; label: string }[] = [];
  const closedSunday = !m.windows.sun.on;
  // Self-collection today only while still open today.
  let start = m.firstDay;
  if (start === 0 && !isOpen(m, now)) start = 1;
  for (let i = start; out.length < count && i < count + 7; i++) {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + i));
    if (closedSunday && d.getUTCDay() === 0) continue;
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

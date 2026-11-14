import type { DeliveryMethod, Range, Weekday } from "./settings";

/**
 * When an order arrives, for each delivery option (shared by checkout, the server and the homepage).
 * Customers can always order; these rules only decide the delivery date / slot.
 * Singapore is UTC+8 with no daylight saving.
 */
const SG = 8 * 3600_000;
const KEYS: Weekday[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
export const sgNow = (now = Date.now()) => new Date(now + SG); // read with getUTC*
const hm = (d: Date) => `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
const ymd = (d: Date) => d.toISOString().slice(0, 10);
const day = (base: Date, plus: number) => new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate() + plus));
const wk = (d: Date) => KEYS[d.getUTCDay()];
/** A Singapore wall-clock time on a date, as a real moment. */
const at = (d: Date, t: string) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), +t.slice(0, 2), +t.slice(3, 5)) - SG;

export const todaySG = (now = Date.now()) => ymd(sgNow(now));

/** "23:59" → "11:59PM", "11:00" → "11AM". */
export function clock(t: string) {
  const [h, m] = t.split(":").map(Number);
  const ap = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return m ? `${h12}:${String(m).padStart(2, "0")}${ap}` : `${h12}${ap}`;
}
export const rangeLabel = (r: Range) => `${clock(r.from)} – ${clock(r.to)}`;
const rangesLabel = (rs: Range[]) => rs.map(rangeLabel).join(", ");

function dayName(d: Date, today: Date) {
  const diff = Math.round((d.getTime() - day(today, 0).getTime()) / 86400_000);
  const dm = d.toLocaleDateString("en-SG", { day: "numeric", month: "short", timeZone: "UTC" });
  const wd = d.toLocaleDateString("en-SG", { weekday: "short", timeZone: "UTC" });
  return { top: diff === 0 ? "Today" : diff === 1 ? "Tomorrow" : wd, dm, long: fullDate(d) };
}

/** "Monday, 16 November 2026" */
export const fullDate = (d: Date) => d.toLocaleDateString("en-SG", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export type DateOpt = { date: string; label: string; full: string; detail: string; slots?: { id: string; label: string }[] };
export type Arrival = {
  pick: "none" | "date" | "slot"; // what the customer chooses
  date: string; // the date when nothing is chosen (YYYY-MM-DD)
  summary: string; // e.g. "Arrives tomorrow, 11AM – 11PM"
  slotText: string; // stored on the order, e.g. "Within 2 hours"
  dates: DateOpt[];
};

const serviceDates = (m: DeliveryMethod, today: Date, from: number, count = 14) => {
  const out: Date[] = [];
  for (let i = from; out.length < count && i < from + count + 14; i++) {
    const d = day(today, i);
    if (m.serviceDays[wk(d)]) out.push(d);
  }
  return out;
};

export function arrival(m: DeliveryMethod, now = Date.now()): Arrival {
  const today = sgNow(now);
  const t = hm(today);
  const hoursOf = (d: Date) => m.hours[wk(d)] ?? [];
  const label = (d: Date) => { const n = dayName(d, today); return `${n.top}|${n.dm}`; };

  switch (m.id) {
    case "SAME_DAY": {
      const todayOk = m.serviceDays[wk(today)] && t < m.cutoff;
      const d = todayOk ? day(today, 0) : serviceDates(m, today, 1, 1)[0];
      const n = dayName(d, today);
      return { pick: "none", date: ymd(d), slotText: rangesLabel(hoursOf(d)), dates: [],
        summary: `Arrives ${n.long}` };
    }
    case "EXPRESS": {
      // Running now? Otherwise the next time it opens.
      for (let i = 0; i < 8; i++) {
        const d = day(today, i);
        for (const r of hoursOf(d)) {
          if (i === 0 && t >= r.from && t <= r.to) return { pick: "none", date: ymd(d), slotText: "Within 2 hours", dates: [], summary: `Arrives ${fullDate(d)}, within 2 hours` };
          if (at(d, r.from) > now) {
            const n = dayName(d, today);
            return { pick: "none", date: ymd(d), slotText: `Within 2 hours from ${clock(r.from)}`, dates: [],
              summary: `Arrives ${n.long}, within 2 hours from ${clock(r.from)}` };
          }
        }
      }
      return { pick: "none", date: ymd(today), slotText: "Within 2 hours", dates: [], summary: `Arrives ${fullDate(today)}, within 2 hours` };
    }
    case "COLLECT": {
      const startToday = m.serviceDays[wk(today)] && t < m.cutoff;
      const ds = serviceDates(m, today, startToday ? 0 : 1).filter((d) => hoursOf(d).length);
      const dates = ds.map((d) => ({ date: ymd(d), label: label(d), full: fullDate(d), detail: rangesLabel(hoursOf(d)) }));
      return { pick: "date", date: dates[0]?.date ?? "", slotText: dates[0]?.detail ?? "", dates,
        summary: dates[0] ? `Collect from ${dates[0].full}` : "" };
    }
    case "TIMED": {
      const earliest = now + m.leadHours * 3600_000;
      const dates: DateOpt[] = [];
      for (const d of serviceDates(m, today, 0, 20)) {
        const slots = m.slots.filter((r) => at(d, r.from) >= earliest).map((r) => ({ id: `${r.from}-${r.to}`, label: rangeLabel(r) }));
        if (slots.length) dates.push({ date: ymd(d), label: label(d), full: fullDate(d), detail: `${slots.length} slots`, slots });
        if (dates.length >= 14) break;
      }
      return { pick: "slot", date: dates[0]?.date ?? "", slotText: "", dates,
        summary: dates[0]?.slots ? `Choose a 3-hour slot · earliest ${dates[0].full}, ${dates[0].slots[0].label}` : "" };
    }
    default: { // NEXT_DAY: the next delivery day after today (Saturday and Sunday orders: Monday)
      const ds = serviceDates(m, today, 1);
      const dates = ds.map((d) => ({ date: ymd(d), label: label(d), full: fullDate(d), detail: rangesLabel(hoursOf(d)) }));
      return { pick: "date", date: dates[0].date, slotText: dates[0].detail, dates,
        summary: `Arrives ${dates[0].full}` };
    }
  }
}

export const feeFor = (m: DeliveryMethod, subtotal: number) => (m.freeFrom > 0 && subtotal >= m.freeFrom ? 0 : m.fee);

/** Is same-day really today right now? (Used for the free same-day goal and the badge.) */
export const sameDayToday = (m: DeliveryMethod, now = Date.now()) => {
  const d = sgNow(now);
  return m.serviceDays[wk(d)] && hm(d) < m.cutoff;
};

/** Free-delivery goals for the cart bar: next day always; same day only while it really is same-day. */
export const freeGoals = (methods: DeliveryMethod[], now = Date.now()) =>
  methods.filter((m) => m.enabled && m.freeFrom > 0 && (m.id !== "SAME_DAY" || sameDayToday(m, now)))
    .sort((a, b) => a.freeFrom - b.freeFrom)
    .map((m) => ({ label: m.name.toLowerCase().replace(/(\w+) day/, "$1-day"), threshold: m.freeFrom }));

export function dayLabel(date: string) {
  if (!date) return "";
  return fullDate(new Date(date + "T00:00:00Z"));
}

const DAY_NAMES: Record<Weekday, string> = { sun: "Sundays", mon: "Mondays", tue: "Tuesdays", wed: "Wednesdays", thu: "Thursdays", fri: "Fridays", sat: "Saturdays" };

/** The homepage badge: the best delivery a customer can get right now. */
export function deliveryHeadline(methods: DeliveryMethod[], now = Date.now()): { text: string; open: boolean } {
  const d = sgNow(now);
  const today = wk(d);
  const t = hm(d);
  const find = (id: DeliveryMethod["id"]) => methods.find((m) => m.id === id && m.enabled);
  const same = find("SAME_DAY"), express = find("EXPRESS"), next = find("NEXT_DAY");

  if (same && sameDayToday(same, now)) return { text: `Same-day delivery · order by ${clock(same.cutoff)}`, open: true };
  if (express) {
    const r = (express.hours[today] ?? []).find((x) => t >= x.from && t <= x.to);
    if (r) {
      let end = r.to;
      const tomorrow = express.hours[KEYS[(d.getUTCDay() + 1) % 7]] ?? [];
      if (end >= "23:59" && tomorrow[0]?.from === "00:00") end = tomorrow[0].to; // runs past midnight
      return { text: `Express delivery · order by ${clock(end)}`, open: true };
    }
  }
  if (next) {
    const by = `order by ${clock(next.cutoff)}`;
    if (!next.serviceDays[today]) return { text: `Closed on ${DAY_NAMES[today]} · Next-day delivery, ${by}`, open: false };
    const arrives = arrival(next, now).date;
    if (arrives === ymd(day(d, 1))) return { text: `Next-day delivery · ${by}`, open: true };
    return { text: `Next-day delivery · ${by} for ${dayName(new Date(arrives + "T00:00:00Z"), d).long}`, open: true };
  }
  return { text: "Order now", open: false };
}

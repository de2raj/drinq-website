import { SHOP } from "./config";

/** Singapore is UTC+8 all year (no daylight saving). */
const SG_OFFSET = 8 * 3600_000;
const sgNow = (now = Date.now()) => new Date(now + SG_OFFSET); // read with getUTC* = Singapore wall clock

const ymd = (d: Date) => d.toISOString().slice(0, 10);

export type DeliveryDay = { date: string; label: string; top: string; dm: string; slots: { id: string; label: string }[] };

/** Days and slots still bookable, in Singapore time. */
export function deliveryDays(now = Date.now()): DeliveryDay[] {
  const earliest = now + SHOP.minLeadHours * 3600_000;
  const today = sgNow(now);
  const days: DeliveryDay[] = [];
  for (let i = 0; i < SHOP.daysAhead; i++) {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + i));
    const date = ymd(d);
    const slots = SHOP.slots
      .filter((s) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), s.start) - SG_OFFSET >= earliest)
      .map((s) => ({ id: s.id, label: s.label }));
    if (!slots.length) continue;
    const wd = d.toLocaleDateString("en-SG", { weekday: "short", timeZone: "UTC" });
    const dm = d.toLocaleDateString("en-SG", { day: "numeric", month: "short", timeZone: "UTC" });
    const top = i === 0 ? "Today" : i === 1 ? "Tomorrow" : wd;
    days.push({ date, label: `${top}, ${dm}`, top, dm, slots });
  }
  return days;
}

export const isBookable = (date: string, slot: string, now = Date.now()) =>
  deliveryDays(now).some((d) => d.date === date && d.slots.some((s) => s.id === slot));

export const deliveryFee = (subtotal: number) => (subtotal >= SHOP.freeDeliveryFrom || subtotal === 0 ? 0 : SHOP.deliveryFee);

export function slotLabel(date: string, slot: string) {
  const d = new Date(date + "T00:00:00Z");
  const day = d.toLocaleDateString("en-SG", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
  return `${day}, ${SHOP.slots.find((s) => s.id === slot)?.label ?? slot}`;
}

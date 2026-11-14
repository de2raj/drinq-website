import "server-only";
import { db } from "./db";

/**
 * Shop settings edited in /admin/settings. Stored as JSON per key in the Setting table;
 * anything not saved yet uses the defaults below.
 */

export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
export const WEEKDAYS: { key: Weekday; label: string }[] = [
  { key: "mon", label: "Monday" }, { key: "tue", label: "Tuesday" }, { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" }, { key: "fri", label: "Friday" }, { key: "sat", label: "Saturday" }, { key: "sun", label: "Sunday" },
];
export type Window = { on: boolean; from: string; to: string }; // "HH:MM", Singapore time

export type DeliveryMethod = {
  id: "NEXT_DAY" | "SAME_DAY" | "EXPRESS" | "COLLECT";
  name: string;
  enabled: boolean;
  fee: number; // cents
  freeFrom: number; // cents, 0 = never free
  pickDate: boolean; // customer chooses a date
  firstDay: 0 | 1; // earliest date: 0 = today, 1 = tomorrow
  when: string; // shown to the customer, e.g. "Delivered between 11:00 - 23:00 next day"
  notice: string; // the option's rules, one per line
  closedMessage: string; // shown when it can't be chosen right now
  windows: Record<Weekday, Window>; // when it can be ordered
  address?: string; // self-collection point
};

const days = (w: Partial<Record<Weekday, Window>>, fallback: Window): Record<Weekday, Window> =>
  Object.fromEntries((["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as Weekday[]).map((d) => [d, w[d] ?? fallback])) as Record<Weekday, Window>;
const OFF: Window = { on: false, from: "00:00", to: "23:59" };

/** Copied from botello.sg's checkout (Next Day, Same Day, Express, Self-Collection). */
export const DEFAULT_DELIVERY: DeliveryMethod[] = [
  {
    id: "NEXT_DAY", name: "Next Day Delivery", enabled: true, fee: 1200, freeFrom: 20000, pickDate: true, firstDay: 1,
    when: "Delivered between 11:00 - 23:00",
    notice: "FREE delivery for orders above $200\nOrder by 23:59, delivered between 11:00 - 23:00 next day",
    closedMessage: "Sorry, we are closed on Sundays. We will resume operations on Monday.",
    windows: days({ sun: OFF }, { on: true, from: "00:00", to: "23:59" }),
  },
  {
    id: "SAME_DAY", name: "Same Day Delivery", enabled: true, fee: 1500, freeFrom: 30000, pickDate: false, firstDay: 0,
    when: "Delivered today between 11:00 - 23:00",
    notice: "FREE delivery for orders above $300\nOrder by 11:00, delivered between 11:00 ~ 23:00 same day\nNot available on Sunday",
    closedMessage: "Same day delivery is not available as it is past the cut-off time. Kindly select Express Delivery.",
    windows: days({ sat: OFF, sun: OFF }, { on: true, from: "00:00", to: "11:00" }),
  },
  {
    id: "EXPRESS", name: "Express Delivery", enabled: true, fee: 2000, freeFrom: 0, pickDate: false, firstDay: 0,
    when: "Delivered within 2 hours",
    notice: "Order by 23:59 Monday to Thursday, or 02:30 Friday and Saturday, delivered within 2 hours\nNot available on Sunday",
    closedMessage: "Express delivery will resume at 11AM.",
    windows: days(
      { fri: { on: false, from: "11:00", to: "23:59" }, sat: { on: true, from: "18:00", to: "23:59" }, sun: { on: true, from: "00:00", to: "02:30" } },
      { on: true, from: "11:00", to: "23:59" },
    ),
  },
  {
    id: "COLLECT", name: "Self-Collection", enabled: true, fee: 0, freeFrom: 0, pickDate: true, firstDay: 0,
    when: "Collect between 11:00 - 22:30",
    notice: "Collect between 11:00 - 22:30 Monday to Friday, or 18:00 - 22:30 on Saturday\nNot available on Sunday",
    closedMessage: "Sorry, we are closed on Sundays. We will resume operations on Monday.",
    windows: days({ sun: OFF }, { on: true, from: "11:00", to: "22:30" }),
    address: "65 Ubi Road 1 #01-82 Oxley Bizhub Singapore 408729",
  },
];

export type PaymentOption = { id: "PAYNOW" | "CARD" | "APPLE_PAY" | "GOOGLE_PAY" | "GRABPAY"; name: string; detail: string; enabled: boolean };
export type PaymentSettings = { testMode: boolean; options: PaymentOption[] };
export const DEFAULT_PAYMENTS: PaymentSettings = {
  testMode: true,
  options: [
    { id: "PAYNOW", name: "PayNow QR", detail: "Scan with any Singapore banking app", enabled: true },
    { id: "CARD", name: "Credit / Debit Card", detail: "Visa, Mastercard, AMEX", enabled: true },
    { id: "APPLE_PAY", name: "Apple Pay", detail: "Pay with Face ID or Touch ID", enabled: true },
    { id: "GOOGLE_PAY", name: "Google Pay", detail: "Pay with your Google account", enabled: true },
    { id: "GRABPAY", name: "GrabPay", detail: "Pay with your Grab wallet", enabled: true },
  ],
};

export type StoreSettings = {
  announcement: string; // top bar
  freeNote: string; // footnote for the "*"
  heroSlugs: string[]; // three products shown in the homepage circle
  heroBadge: string; // the round sticker
};
export const DEFAULT_STORE: StoreSettings = {
  announcement: "Free delivery* from $200 · Same-day delivery across Singapore",
  freeNote: "*Free next-day delivery from $200. Free same-day delivery from $300.",
  heroSlugs: ["chivas-regal-12-years", "macallan-12-years-double-cask", "hennessy-vsop-cognac-700ml"],
  heroBadge: "",
};

const DEFAULTS = { store: DEFAULT_STORE, delivery: DEFAULT_DELIVERY, payments: DEFAULT_PAYMENTS };
type Key = keyof typeof DEFAULTS;
type Value<K extends Key> = (typeof DEFAULTS)[K];

let cache: { at: number; values: Partial<{ [K in Key]: Value<K> }> } | null = null;

export async function getSetting<K extends Key>(key: K): Promise<Value<K>> {
  if (!cache || Date.now() - cache.at > 60_000) {
    const rows = await db.setting.findMany().catch(() => []);
    const values: Record<string, unknown> = {};
    for (const r of rows) try { values[r.key] = JSON.parse(r.value); } catch {}
    cache = { at: Date.now(), values: values as typeof cache extends null ? never : NonNullable<typeof cache>["values"] };
  }
  const v = cache.values[key] as Value<K> | undefined;
  if (v === undefined) return DEFAULTS[key];
  // New fields added to the defaults later still show up.
  if (!Array.isArray(v) && typeof v === "object") return { ...DEFAULTS[key], ...v } as Value<K>;
  return v;
}

export async function saveSetting<K extends Key>(key: K, value: Value<K>) {
  const json = JSON.stringify(value);
  await db.setting.upsert({ where: { key }, create: { key, value: json }, update: { value: json } });
  cache = null;
}

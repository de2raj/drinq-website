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
export type Range = { from: string; to: string }; // "HH:MM", Singapore time

export type MethodId = "NEXT_DAY" | "SAME_DAY" | "EXPRESS" | "COLLECT" | "TIMED";

/**
 * A delivery option. Customers can always order every option; the rules only decide
 * WHEN the order arrives (see src/lib/delivery.ts).
 */
export type DeliveryMethod = {
  id: MethodId;
  name: string;
  enabled: boolean;
  fee: number; // cents
  freeFrom: number; // cents, 0 = never free
  serviceDays: Record<Weekday, boolean>; // days we deliver / hand over
  cutoff: string; // SAME_DAY: order by this time for today; COLLECT: today can be picked until this time
  hours: Record<Weekday, Range[]>; // EXPRESS: when it runs; COLLECT: collection hours; others: delivery hours
  slots: Range[]; // TIMED: the slots customers choose from
  leadHours: number; // TIMED: earliest slot starts at least this many hours from now
  notice: string; // the option's rules, one per line, shown at checkout
  address?: string; // self-collection point
};

const MON_SAT: Record<Weekday, boolean> = { mon: true, tue: true, wed: true, thu: true, fri: true, sat: true, sun: false };
const each = (r: Range[], over: Partial<Record<Weekday, Range[]>> = {}): Record<Weekday, Range[]> =>
  Object.fromEntries((["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as Weekday[]).map((d) => [d, over[d] ?? r])) as Record<Weekday, Range[]>;
const DAY_DELIVERY = each([{ from: "11:00", to: "23:00" }], { sun: [] });

/** DRINQ's delivery rules (2026-11-15). Customers can order any time; nothing closes. */
export const DEFAULT_DELIVERY: DeliveryMethod[] = [
  {
    id: "NEXT_DAY", name: "Next Day Delivery", enabled: true, fee: 1200, freeFrom: 20000,
    serviceDays: MON_SAT, cutoff: "23:59", hours: DAY_DELIVERY, slots: [], leadHours: 0,
    notice: "FREE delivery for orders of $200 and above\nOrder by 11:59PM, delivered the next day between 11AM - 11PM\nNo deliveries on Sunday: Saturday and Sunday orders arrive on Monday",
  },
  {
    id: "SAME_DAY", name: "Same Day Delivery", enabled: true, fee: 1500, freeFrom: 30000,
    serviceDays: MON_SAT, cutoff: "11:00", hours: DAY_DELIVERY, slots: [], leadHours: 0,
    notice: "FREE delivery for orders of $300 and above\nOrder by 11AM, delivered the same day between 11AM - 11PM\nOrders after 11AM go out the next delivery day (Saturday and Sunday orders: Monday)",
  },
  {
    id: "EXPRESS", name: "Express Delivery", enabled: true, fee: 2000, freeFrom: 0,
    serviceDays: { ...MON_SAT, sun: true }, cutoff: "23:59", slots: [], leadHours: 0,
    hours: each([{ from: "09:00", to: "23:59" }], {
      sat: [{ from: "00:00", to: "02:30" }, { from: "18:00", to: "23:59" }],
      sun: [{ from: "00:00", to: "02:30" }],
    }),
    notice: "Delivered within 2 hours\nMonday to Friday 9AM - 11:59PM, Saturday 12AM - 2:30AM and 6PM - 11:59PM, Sunday 12AM - 2:30AM\nOrders outside these hours go out when Express next opens",
  },
  {
    id: "COLLECT", name: "Self-Collection", enabled: true, fee: 0, freeFrom: 0,
    serviceDays: MON_SAT, cutoff: "22:30", slots: [], leadHours: 0,
    hours: each([{ from: "09:00", to: "22:30" }], { sat: [{ from: "18:00", to: "22:30" }], sun: [] }),
    notice: "Collect Monday to Friday 9AM - 10:30PM, Saturday 6PM - 10:30PM\nClosed on Sunday",
    address: "65 Ubi Road 1 #01-82 Oxley Bizhub Singapore 408729",
  },
  {
    id: "TIMED", name: "Timed Delivery", enabled: true, fee: 2500, freeFrom: 0,
    serviceDays: MON_SAT, cutoff: "23:59", hours: DAY_DELIVERY, leadHours: 3,
    slots: [{ from: "11:00", to: "14:00" }, { from: "14:00", to: "17:00" }, { from: "17:00", to: "20:00" }, { from: "20:00", to: "23:00" }],
    notice: "Choose your own 3-hour delivery slot\n$25 flat, whatever the order amount\nMonday to Saturday",
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

export const THEMES = { rose: "Pink", dark: "Black", yellow: "Yellow", white: "White" } as const;
export type Slide = {
  show: boolean;
  slug: string; // product: price and Add to cart come from it
  pill: string; // small label, e.g. "Rum of the week"
  title: string; // first line
  highlight: string; // second line, in the accent colour
  text: string;
  theme: keyof typeof THEMES;
  image: string; // cut-out photo URL; blank = the product's photo
};
export type StoreSettings = {
  announcement: string; // top bar
  freeNote: string; // footnote for the "*"
  slides: Slide[]; // homepage rotating banner (up to 5)
};
export const DEFAULT_STORE: StoreSettings = {
  announcement: "Free delivery* from $200 · Same-day delivery across Singapore",
  freeNote: "*Free next-day delivery from $200. Free same-day delivery from $300.",
  slides: [
    { show: true, slug: "tequila-rose-strawberry-cream", pill: "New favourite", title: "Tequila Rose", highlight: "Strawberry Cream", text: "Creamy strawberry with a tequila kick. Dessert in a glass.", theme: "rose", image: "/hero/tequila-rose.webp" },
    { show: true, slug: "black-tears-spiced-rum-700ml", pill: "Rum of the week", title: "Black Tears", highlight: "Spiced Rum", text: "Cuban spiced rum with cacao and coffee. Smooth on ice.", theme: "dark", image: "/hero/black-tears.webp" },
    { show: true, slug: "1906-vodka", pill: "Party staple", title: "1906", highlight: "Vodka", text: "Clean, smooth and great value.", theme: "yellow", image: "/hero/1906-vodka.webp" },
    { show: false, slug: "", pill: "", title: "", highlight: "", text: "", theme: "white", image: "" },
    { show: false, slug: "", pill: "", title: "", highlight: "", text: "", theme: "white", image: "" },
  ],
};

export type LoyaltySettings = {
  enabled: boolean;
  earnPerDollar: number; // points per $1 of products (not delivery)
  block: number; // points are used in blocks of this many
  blockValue: number; // cents off per block
  expiryMonths: number; // points expire this long after they're earned (0 = never)
};
export const DEFAULT_LOYALTY: LoyaltySettings = { enabled: true, earnPerDollar: 1, block: 100, blockValue: 500, expiryMonths: 12 };

const DEFAULTS = { store: DEFAULT_STORE, delivery: DEFAULT_DELIVERY, payments: DEFAULT_PAYMENTS, loyalty: DEFAULT_LOYALTY };
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
  if (key === "delivery" && Array.isArray(v)) {
    const saved = v as Partial<DeliveryMethod>[];
    // Settings saved under the old rules (before "hours") are replaced by the current defaults.
    if (saved.some((m) => !m.hours)) return DEFAULTS[key];
    // Options added later (e.g. Timed Delivery) appear even if not saved yet.
    return DEFAULT_DELIVERY.map((d) => ({ ...d, ...(saved.find((m) => m.id === d.id) ?? {}) })) as Value<K>;
  }
  // New fields added to the defaults later still show up.
  if (!Array.isArray(v) && typeof v === "object") return { ...DEFAULTS[key], ...v } as Value<K>;
  return v;
}

export async function saveSetting<K extends Key>(key: K, value: Value<K>) {
  const json = JSON.stringify(value);
  await db.setting.upsert({ where: { key }, create: { key, value: json }, update: { value: json } });
  cache = null;
}

"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { toCents } from "@/lib/admin-products";
import { allProducts } from "@/lib/catalogue";
import { getSetting, saveSetting, WEEKDAYS, type DeliveryMethod } from "@/lib/settings";

const str = (fd: FormData, k: string, max = 500) => String(fd.get(k) ?? "").trim().slice(0, max);
const time = (v: string, d: string) => (/^([01]\d|2[0-3]):[0-5]\d$/.test(v) ? v : d);
const done = (section: string) => { revalidatePath("/", "layout"); redirect(`/admin/settings?saved=${section}#${section}`); };

export async function saveStore(fd: FormData) {
  const store = await getSetting("store");
  const products = await allProducts();
  const heroSlugs = [0, 1, 2].map((i) => {
    const v = str(fd, `hero${i}`, 200);
    return products.find((p) => p.name === v || p.slug === v)?.slug ?? store.heroSlugs[i] ?? "";
  }).filter(Boolean);
  await saveSetting("store", { ...store, announcement: str(fd, "announcement", 200), freeNote: str(fd, "freeNote", 300), heroSlugs });
  done("homepage");
}

export async function saveDelivery(fd: FormData) {
  const methods = await getSetting("delivery");
  const next: DeliveryMethod[] = methods.map((m) => {
    const k = (f: string) => `${m.id}.${f}`;
    const fee = toCents(fd.get(k("fee")));
    const free = toCents(fd.get(k("freeFrom")));
    return {
      ...m,
      enabled: fd.get(k("enabled")) === "on",
      name: str(fd, k("name"), 60) || m.name,
      fee: fee !== null && !Number.isNaN(fee) ? fee : m.fee,
      freeFrom: free !== null && !Number.isNaN(free) ? free : 0,
      pickDate: fd.get(k("pickDate")) === "on",
      firstDay: fd.get(k("firstDay")) === "1" ? 1 : 0,
      when: str(fd, k("when"), 120),
      notice: str(fd, k("notice"), 800),
      closedMessage: str(fd, k("closedMessage"), 300),
      ...(m.id === "COLLECT" ? { address: str(fd, k("address"), 200) } : {}),
      windows: Object.fromEntries(WEEKDAYS.map(({ key }) => [key, {
        on: fd.get(k(`${key}.on`)) === "on",
        from: time(str(fd, k(`${key}.from`), 5), m.windows[key].from),
        to: time(str(fd, k(`${key}.to`), 5), m.windows[key].to),
      }])) as DeliveryMethod["windows"],
    };
  });
  await saveSetting("delivery", next);
  done("delivery");
}

export async function savePayments(fd: FormData) {
  const p = await getSetting("payments");
  await saveSetting("payments", {
    testMode: fd.get("testMode") === "on",
    options: p.options.map((o) => ({ ...o, enabled: fd.get(`${o.id}.enabled`) === "on", name: str(fd, `${o.id}.name`, 40) || o.name, detail: str(fd, `${o.id}.detail`, 80) })),
  });
  done("payments");
}

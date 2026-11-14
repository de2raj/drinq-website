import "server-only";
import type { PickMethod, PickProduct } from "@/components/OrderEditor";
import { allProducts } from "./catalogue";
import { arrival, rangeLabel } from "./delivery";
import { getSetting } from "./settings";

/** Products, delivery options and payment methods for the staff order form. */
export async function editorData() {
  const [products, methods, payments] = await Promise.all([allProducts(), getSetting("delivery"), getSetting("payments")]);
  const pick: PickProduct[] = products.map((p) => ({ id: p.id, name: p.name, price: p.price, thumb: p.thumb, inStock: p.inStock }));
  const ms: PickMethod[] = methods.filter((m) => m.enabled).map((m) => {
    const a = arrival(m);
    const d = a.dates[0];
    return {
      id: m.id, name: m.name, fee: m.fee, freeFrom: m.freeFrom,
      date: a.date || d?.date || "",
      slot: a.pick === "slot" ? d?.slots?.[0]?.label ?? "" : a.pick === "date" ? d?.detail ?? "" : a.slotText,
      slots: m.id === "TIMED" ? m.slots.map(rangeLabel) : [],
    };
  });
  return { products: pick, methods: ms, payments: payments.options.map(({ id, name }) => ({ id, name })), thumbs: new Map(products.map((p) => [p.id, p.thumb])) };
}

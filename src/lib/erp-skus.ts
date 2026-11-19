import "server-only";
import erpList from "../../data/erp-sku-list.json";
import map from "../../data/erp-skus.json";
import { invalidateCatalogue } from "./catalogue";
import { db } from "./db";
import { decode } from "./text";

/** Every SKU in the ERP (data/erp-sku-list.json, refreshed when the ERP is connected). */
const ERP_SKUS = new Set<string>(erpList as string[]);
/** An ERP product code, e.g. WHS-CREG-700-01 or BAR-ICE-02: in the ERP list, or shaped like one (added since). */
export const isErpSku = (s: string) => ERP_SKUS.has(s) || /^[A-Z]{3}(-[A-Z0-9]+){1,2}-\d{2}$/.test(s);

const KEY = "erpSkuVersion";

/**
 * Once per version of data/erp-skus.json: give every product its ERP SKU, and blank old Botello codes
 * on products the ERP doesn't have yet. Later hand edits in Admin → Products are kept.
 * Fills alcohol % (ABV) from the ERP and ticks Gift box for products named "…Gift…".
 * Also cleans HTML codes (&#8211;) out of saved product and order-line names.
 */
export async function applyErpSkus() {
  const done = await db.setting.findUnique({ where: { key: KEY } });
  if (done?.value === JSON.stringify(map.version)) return 0;
  const skus = map.skus as Record<string, string>;
  const abvs = (map as { abv?: Record<string, number> }).abv ?? {};
  let changed = 0;
  for (const p of await db.product.findMany({ select: { id: true, sku: true, name: true, brand: true, abv: true, giftBox: true } })) {
    const sku = skus[p.id] ?? (isErpSku(p.sku) ? p.sku : "");
    const name = decode(p.name), brand = decode(p.brand);
    const abv = p.abv ?? abvs[p.id] ?? null; // ERP alcohol %, unless set by hand
    const giftBox = p.giftBox || /\bgift\b/i.test(name);
    if (sku !== p.sku || name !== p.name || brand !== p.brand || abv !== p.abv || giftBox !== p.giftBox) {
      await db.product.update({ where: { id: p.id }, data: { sku, name, brand, abv, giftBox } });
      changed++;
    }
  }
  for (const l of await db.orderLine.findMany({ where: { name: { contains: "&" } }, select: { id: true, productId: true, name: true, sku: true } })) {
    await db.orderLine.update({ where: { id: l.id }, data: { name: decode(l.name), sku: skus[l.productId] ?? l.sku } });
  }
  for (const l of await db.orderLine.findMany({ select: { id: true, productId: true, sku: true } })) {
    const sku = skus[l.productId];
    if (sku && sku !== l.sku) await db.orderLine.update({ where: { id: l.id }, data: { sku } });
  }
  await db.setting.upsert({ where: { key: KEY }, create: { key: KEY, value: JSON.stringify(map.version) }, update: { value: JSON.stringify(map.version) } });
  invalidateCatalogue();
  return changed;
}

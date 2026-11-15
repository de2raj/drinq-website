import "server-only";
import details from "../../data/product-details.json";
import { invalidateCatalogue } from "./catalogue";
import { db } from "./db";

type Details = { chars: Record<string, string>; sections: Record<string, string>; notes?: [string, string][] };
const KEY = "productDetailsVersion";
// Shown in their own fields, so not repeated in the extra characteristics.
const OWN = /^(brand|.*volume.*|product weight.*|alcohol percentage|abv|country of origin|origin|gift box)$/i;

/**
 * Once per version of data/product-details.json (copied from botello.sg product pages):
 * fills description, tasting notes, origin, ABV, gift box and other characteristics.
 * Only empty fields are filled, so edits made in Admin → Products are kept.
 */
export async function applyProductDetails() {
  const data = details as unknown as { version: string; products: Record<string, Details> };
  const done = await db.setting.findUnique({ where: { key: KEY } });
  if (done?.value === JSON.stringify(data.version)) return 0;

  let changed = 0;
  const rows = await db.product.findMany({ select: { id: true, description: true, tastingNotes: true, origin: true, abv: true, giftBox: true, specs: true } });
  for (const p of rows) {
    const d = data.products[p.id];
    if (!d) continue;
    const c = Object.fromEntries(Object.entries(d.chars).map(([k, v]) => [k.toLowerCase(), v]));
    const secs = Object.entries(d.sections);
    const desc = secs.filter(([t]) => !/tasting/i.test(t)).map(([t, b]) => (/^description$/i.test(t) ? b : `${t}\n\n${b}`)).join("\n\n");
    const notes = (d.notes ?? []).map(([k, v]) => `${k}: ${v}`).join("\n")
      || secs.filter(([t]) => /tasting/i.test(t)).map(([, b]) => b.split(/\n+/).join("\n")).join("\n");
    const abv = parseFloat((c["alcohol percentage"] ?? c["abv"] ?? "").replace(",", "."));
    const specs = Object.entries(d.chars).filter(([k, v]) => !OWN.test(k.trim()) && v && !/^(n\/?a|-)$/i.test(v));
    const patch = {
      ...(!p.description && desc ? { description: desc } : {}),
      ...(!p.tastingNotes && notes ? { tastingNotes: notes } : {}),
      ...(!p.origin && (c["country of origin"] || c["origin"]) ? { origin: c["country of origin"] || c["origin"] } : {}),
      ...(p.abv == null && Number.isFinite(abv) && abv > 0 && abv <= 100 ? { abv } : {}),
      ...(!p.giftBox && /^yes/i.test(c["gift box"] ?? "") ? { giftBox: true } : {}),
      ...(!p.specs && specs.length ? { specs: JSON.stringify(specs) } : {}),
    };
    if (Object.keys(patch).length) {
      await db.product.update({ where: { id: p.id }, data: patch });
      changed++;
    }
  }
  await db.setting.upsert({ where: { key: KEY }, create: { key: KEY, value: JSON.stringify(data.version) }, update: { value: JSON.stringify(data.version) } });
  invalidateCatalogue();
  return changed;
}

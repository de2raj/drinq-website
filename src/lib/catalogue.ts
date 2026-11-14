import "server-only";
import seed from "@data/catalogue.json";
import { db } from "./db";
import { decode } from "./text";
import { SECTIONS } from "./sections";
import type { Product, ProductLite, Section, Sub } from "./types";

/**
 * Products live in the database and are edited in /admin.
 * Reads are cached in memory for a short time; /admin clears the cache on every change.
 */
type Row = Awaited<ReturnType<typeof db.product.findMany>>[number];
const toProduct = (r: Row): Product => ({
  id: r.id, sku: r.sku, slug: r.slug, name: decode(r.name), brand: decode(r.brand), size: r.size,
  price: r.price, was: r.was, categories: r.categories ? r.categories.split("|") : [],
  image: r.image, thumb: r.thumb || r.image, inStock: r.inStock, active: r.active, rank: r.rank,
});

let cache: { at: number; all: Product[] } | null = null;
const TTL = 60_000;

/** Every product, including hidden ones (for /admin). */
export async function everyProduct(): Promise<Product[]> {
  if (cache && Date.now() - cache.at < TTL) return cache.all;
  const rows = await db.product.findMany({ orderBy: [{ rank: "asc" }, { name: "asc" }] });
  cache = { at: Date.now(), all: rows.map(toProduct) };
  return cache.all;
}
export const invalidateCatalogue = () => { cache = null; };

/** Products shown in the shop (not hidden). */
export const allProducts = async () => (await everyProduct()).filter((p) => p.active);
export const productBySlug = async (slug: string) => (await allProducts()).find((p) => p.slug === slug);
export const productById = async (id: string) => (await allProducts()).find((p) => p.id === id);

export const lite = (p: Product): ProductLite => ({
  id: p.id, slug: p.slug, name: p.name, brand: p.brand, size: p.size,
  price: p.price, was: p.was, thumb: p.thumb, inStock: p.inStock, rank: p.rank,
});

const hasAny = (p: Product, cats: string[]) => cats.some((c) => p.categories.includes(c));
export const inSection = (p: Product, s: Section) => hasAny(p, s.cats) || s.subs.some((x) => hasAny(p, x.cats));
export const inSub = (p: Product, sub: Sub) => hasAny(p, sub.cats);

export const sectionProducts = async (s: Section) => (await allProducts()).filter((p) => inSection(p, s));
export const subProducts = async (sub: Sub) => (await allProducts()).filter((p) => inSub(p, sub));

export function sectionOf(p: Product) {
  const s = SECTIONS.find((x) => !x.deal && inSection(p, x));
  return { section: s, sub: s?.subs.find((x) => inSub(p, x)) };
}

export async function search(q: string) {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  return (await allProducts()).filter((p) => {
    const hay = `${p.name} ${p.brand} ${p.categories.join(" ")}`.toLowerCase();
    return words.every((w) => hay.includes(w));
  });
}

/** Small index the header search box uses in the browser. */
export const searchIndex = async () =>
  (await allProducts()).map((p) => ({ s: p.slug, n: p.name, b: p.brand, t: p.thumb, p: p.price, k: p.inStock ? 1 : 0 }));

/** Menu counts and a picture per sub, for the header and category pages. */
/** The photo shown for each category in the menu (falls back to its best seller). */
const SECTION_PIC: Record<string, string> = {
  whisky: "chivas-regal-12-years", spirits: "1906-vodka", wine: "billecart-salmon-brut-reserve-champagne-750ml",
  beer: "carlsberg-short-cans-24-cans-x-320ml-2", mixers: "100-plus-isotonic-drink-24-cans-x-325ml", party: "ice-bag-3kg",
};

export async function menu() {
  const all = await allProducts();
  return SECTIONS.map((s) => {
    const items = all.filter((p) => inSection(p, s));
    const tally = (key: "brand" | "size") => {
      const m = new Map<string, number>();
      items.forEach((p) => p[key] && m.set(p[key], (m.get(p[key]) || 0) + 1));
      return [...m].sort((a, b) => b[1] - a[1]);
    };
    return {
      name: s.name, slug: s.slug, deal: !!s.deal, count: items.length,
      pic: all.find((p) => p.slug === SECTION_PIC[s.slug])?.thumb ?? [...items].sort((a, b) => a.rank - b.rank).find((p) => p.thumb)?.thumb ?? "",
      subs: s.subs.map((x) => {
        const ps = all.filter((p) => inSub(p, x));
        return { name: x.name, slug: x.slug, count: ps.length, pic: ps.find((p) => p.thumb)?.thumb ?? "" };
      }),
      brands: tally("brand").slice(0, 7),
      sizes: tally("size").slice(0, 5),
    };
  });
}
export type Menu = Awaited<ReturnType<typeof menu>>;

/** First start only: copy data/catalogue.json into the empty Product table. */
export async function seedProductsIfEmpty() {
  if ((await db.product.count()) > 0) return 0;
  type Seed = Omit<Product, "active">;
  const rows = (seed as Seed[]).map((p) => ({
    id: p.id, sku: p.sku, slug: p.slug, name: decode(p.name), brand: decode(p.brand), size: p.size,
    price: p.price, was: p.was, categories: p.categories.join("|"),
    image: p.image, thumb: p.thumb, inStock: p.inStock, active: true, rank: p.rank,
  }));
  for (let i = 0; i < rows.length; i += 100) await db.product.createMany({ data: rows.slice(i, i + 100) });
  invalidateCatalogue();
  return rows.length;
}

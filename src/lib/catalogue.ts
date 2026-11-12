import "server-only";
import raw from "@data/catalogue.json";
import { SECTIONS } from "./sections";
import type { Product, ProductLite, Section, Sub } from "./types";

/**
 * Product source. Today: data/catalogue.json (copied from botello.sg).
 * Later: the Alcools ERP's DRINQ prices and stock — only this file changes.
 */
const PRODUCTS = raw as Product[];
const BY_SLUG = new Map(PRODUCTS.map((p) => [p.slug, p]));
const BY_ID = new Map(PRODUCTS.map((p) => [p.id, p]));

export const allProducts = () => PRODUCTS;
export const productBySlug = (slug: string) => BY_SLUG.get(slug);
export const productById = (id: string) => BY_ID.get(id);

export const lite = (p: Product): ProductLite => ({
  id: p.id, slug: p.slug, name: p.name, brand: p.brand, size: p.size,
  price: p.price, was: p.was, thumb: p.thumb, inStock: p.inStock, rank: p.rank,
});

const hasAny = (p: Product, cats: string[]) => cats.some((c) => p.categories.includes(c));
export const inSection = (p: Product, s: Section) => hasAny(p, s.cats) || s.subs.some((x) => hasAny(p, x.cats));
export const inSub = (p: Product, sub: Sub) => hasAny(p, sub.cats);

export const sectionProducts = (s: Section) => PRODUCTS.filter((p) => inSection(p, s));
export const subProducts = (sub: Sub) => PRODUCTS.filter((p) => inSub(p, sub));

export function sectionOf(p: Product) {
  const s = SECTIONS.find((x) => !x.deal && inSection(p, x));
  return { section: s, sub: s?.subs.find((x) => inSub(p, x)) };
}

export function search(q: string) {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  return PRODUCTS.filter((p) => {
    const hay = `${p.name} ${p.brand} ${p.categories.join(" ")}`.toLowerCase();
    return words.every((w) => hay.includes(w));
  });
}

/** Small index the header search box uses in the browser. */
export const searchIndex = () =>
  PRODUCTS.map((p) => ({ s: p.slug, n: p.name, b: p.brand, t: p.thumb, p: p.price, k: p.inStock ? 1 : 0 }));

/** Menu counts and a picture per sub, for the header and category pages. */
export const menu = () =>
  SECTIONS.map((s) => {
    const items = sectionProducts(s);
    const tally = (key: "brand" | "size") => {
      const m = new Map<string, number>();
      items.forEach((p) => p[key] && m.set(p[key], (m.get(p[key]) || 0) + 1));
      return [...m].sort((a, b) => b[1] - a[1]);
    };
    return {
      name: s.name, slug: s.slug, deal: !!s.deal, count: items.length,
      subs: s.subs.map((x) => {
        const ps = subProducts(x);
        return { name: x.name, slug: x.slug, count: ps.length, pic: ps.find((p) => p.thumb)?.thumb ?? "" };
      }),
      brands: tally("brand").slice(0, 7),
      sizes: tally("size").slice(0, 5),
    };
  });
export type Menu = ReturnType<typeof menu>;

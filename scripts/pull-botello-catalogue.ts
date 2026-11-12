/**
 * Stand-in product source until the Alcools ERP feed is ready:
 * copies Botello's public WooCommerce Store API catalogue into data/catalogue.json.
 *   npm run catalogue:botello
 */
import { writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";

const BASE = "https://botello.sg/wp-json/wc/store/v1/products";
const root = join(__dirname, "..");
const brands: string[] = JSON.parse(readFileSync(join(root, "data/brands.json"), "utf8"))
  .sort((a: string, b: string) => b.length - a.length);

const unescape = (s: string) =>
  s.replace(/&amp;/g, "&").replace(/&#8217;/g, "’").replace(/&#038;/g, "&").replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const titleCase = (s: string) =>
  s.split(" ").map((w) => (w.length > 3 && w === w.toUpperCase() ? w[0] + w.slice(1).toLowerCase() : w)).join(" ");

function brandOf(name: string) {
  const up = name.toUpperCase();
  const b = brands.find((x) => up === x.toUpperCase() || up.startsWith(x.toUpperCase() + " "));
  if (b) return titleCase(b);
  if (/^I LOVE\b/i.test(name)) return "I Love";
  return name.split(" ")[0];
}

function sizeOf(name: string) {
  const pack = name.match(/(\d+)\s*(?:cans|bottles|packets|btls)?\s*x\s*([\d.]+\s*(?:ML|L|CL|G|KG))/i);
  if (pack) return `${pack[1]} × ${fmt(pack[2])}`;
  const all = [...name.matchAll(/([\d.]+)\s*(ML|L|CL|KG|G)\b/gi)];
  return all.length ? fmt(all[all.length - 1][0]) : "";
}
const fmt = (s: string) => s.replace(/\s+/g, "").replace(/ml$/i, "ml").replace(/(\d)l$/i, "$1L").replace(/cl$/i, "cl").replace(/kg$/i, "kg").replace(/(\d)g$/i, "$1g");

type Woo = {
  id: number; name: string; slug: string; sku: string; is_in_stock: boolean;
  prices: { price: string; regular_price: string };
  images: { src: string; thumbnail: string }[];
  categories: { name: string }[];
};

async function main() {
  const all: Woo[] = [];
  for (let page = 1; page < 20; page++) {
    const r = await fetch(`${BASE}?per_page=100&page=${page}&orderby=popularity&order=desc`);
    if (!r.ok) throw new Error(`Botello feed ${r.status}`);
    const batch = (await r.json()) as Woo[];
    all.push(...batch);
    if (batch.length < 100) break;
  }
  const products = all.map((p, rank) => {
    const name = unescape(p.name);
    return {
      id: String(p.id),
      sku: p.sku,
      slug: p.slug,
      name,
      brand: brandOf(name),
      size: sizeOf(name),
      price: Number(p.prices.price),          // cents
      was: Number(p.prices.regular_price),    // cents
      categories: p.categories.map((c) => unescape(c.name)),
      image: p.images[0]?.src ?? "",
      thumb: p.images[0]?.thumbnail ?? "",
      inStock: p.is_in_stock,
      rank,
    };
  });
  writeFileSync(join(root, "data/catalogue.json"), JSON.stringify(products, null, 0));
  console.log(`Saved ${products.length} products`);
}
main();

/**
 * Copies the product details shown on botello.sg product pages (Characteristics list + Description,
 * and any other accordion sections) into data/product-details.json, keyed by the WooCommerce id
 * (= DRINQ product id). The server loads them on start (see src/lib/product-details.ts).
 *   npx tsx scripts/pull-botello-details.ts
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const API = "https://botello.sg/wp-json/wc/store/v1/products";
const out = join(__dirname, "..", "data", "product-details.json");

const text = (html: string) =>
  html.replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|li|div|h\d)>/gi, "\n").replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#8217;|&rsquo;/g, "’").replace(/&#8216;|&lsquo;/g, "‘")
    .replace(/&#8220;|&ldquo;/g, "“").replace(/&#8221;|&rdquo;/g, "”").replace(/&#8211;|&ndash;/g, "–").replace(/&#8212;|&mdash;/g, "—")
    .replace(/&#038;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .split("\n").map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean).join("\n\n");

type Details = { chars: Record<string, string>; sections: Record<string, string>; notes: [string, string][] };

function parse(html: string): Details {
  const chars: Record<string, string> = {};
  for (const m of html.matchAll(/<span class="char-label">([\s\S]*?)<\/span>[\s\S]*?<span class="char-info">([\s\S]*?)<\/span>/g)) {
    const k = text(m[1]), v = text(m[2]);
    if (k && v) chars[k] = v;
  }
  const sections: Record<string, string> = {};
  // Each accordion item: a header link with the title, then a body.
  for (const m of html.matchAll(/<div class="accordion-header">[\s\S]*?alt="[^"]*">\s*([^<]+?)\s*<\/a>[\s\S]*?<div class="accordion-body">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/g)) {
    const title = text(m[1]);
    if (!title || /characteristics/i.test(title)) continue;
    const body = text(m[2]);
    if (body) sections[title] = body;
  }
  // "Tasting notes" tab: Taste / Nose / Finish boxes.
  const notes: [string, string][] = [];
  for (const m of html.matchAll(/<div class="tasting-note-info">\s*<h6[^>]*>([\s\S]*?)<\/h6>\s*<p[^>]*>([\s\S]*?)<\/p>/g)) {
    const k = text(m[1]), v = text(m[2]);
    if (k && v) notes.push([k, v]);
  }
  return { chars, sections, notes };
}

async function main() {
  const list: { id: number; permalink: string }[] = [];
  for (let page = 1; ; page++) {
    const r = await fetch(`${API}?per_page=100&page=${page}`);
    const items = (await r.json()) as { id: number; permalink: string }[];
    if (!Array.isArray(items) || !items.length) break;
    list.push(...items);
  }
  console.log(`${list.length} products`);
  const result: Record<string, Details> = {};
  let done = 0;
  const queue = [...list];
  await Promise.all(Array.from({ length: 4 }, async () => {
    for (let p = queue.shift(); p; p = queue.shift()) {
      try {
        const html = await (await fetch(p.permalink)).text();
        const d = parse(html);
        if (Object.keys(d.chars).length || Object.keys(d.sections).length || d.notes.length) result[p.id] = d;
      } catch (e) {
        console.error("failed", p.permalink, (e as Error).message);
      }
      if (++done % 50 === 0) console.log(done);
      await new Promise((r) => setTimeout(r, 150));
    }
  }));
  writeFileSync(out, JSON.stringify({ version: new Date().toISOString().slice(0, 16), products: result }, null, 0));
  console.log(`saved details for ${Object.keys(result).length} products`);
}
main();

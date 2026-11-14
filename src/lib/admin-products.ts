import "server-only";
import { SECTIONS } from "./sections";

const pretty = (c: string) => (c === c.toUpperCase() ? c.toLowerCase().replace(/\b\w/g, (m) => m.toUpperCase()) : c);

/**
 * Category checkboxes for the edit page, grouped by menu section:
 * one box per sub-category, then any section-wide category ("Whisky (general)").
 */
export const CATEGORY_GROUPS = SECTIONS.map((s) => {
  const seen = new Set<string>();
  const items: { value: string; label: string }[] = [];
  const add = (value: string, label: string) => { if (!seen.has(value)) { seen.add(value); items.push({ value, label }); } };
  s.subs.forEach((x) => x.cats.forEach((c) => add(c, x.cats.length > 1 ? `${x.name} · ${pretty(c)}` : x.name)));
  s.cats.forEach((c, i) => add(c, i === 0 ? `${pretty(c)} (general)` : pretty(c)));
  return { section: s.name, items };
});

export const toCents = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").replace(/[$,\s]/g, "");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : NaN;
};

export const slugify = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "product";

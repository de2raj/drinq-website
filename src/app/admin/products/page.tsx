import type { Metadata } from "next";
import Link from "next/link";
import { AdminNav } from "@/components/AdminNav";
import { everyProduct, inSection } from "@/lib/catalogue";
import { SECTIONS } from "@/lib/sections";
import { quickSave } from "./actions";

export const metadata: Metadata = { title: "Products · Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

const PAGE = 50;
const FILTERS = [
  ["all", "All"],
  ["in", "In stock"],
  ["out", "Sold out"],
  ["sale", "On sale"],
  ["hidden", "Hidden"],
] as const;
type F = (typeof FILTERS)[number][0];
const dollars = (c: number) => (c / 100).toFixed(2);

type SP = { q?: string; sec?: string; f?: string; page?: string };

export default async function AdminProducts({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const q = String(sp.q ?? "").trim();
  const sec = String(sp.sec ?? "");
  const f = (FILTERS.some(([k]) => k === sp.f) ? sp.f : "all") as F;
  const page = Math.max(1, Number(sp.page) || 1);

  const all = await everyProduct();
  const section = SECTIONS.find((s) => s.slug === sec);
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const base = all.filter((p) =>
    (!section || inSection(p, section)) &&
    words.every((w) => `${p.name} ${p.brand} ${p.sku}`.toLowerCase().includes(w)));
  const test: Record<F, (p: (typeof all)[number]) => boolean> = {
    all: () => true, in: (p) => p.active && p.inStock, out: (p) => p.active && !p.inStock,
    sale: (p) => p.was > p.price, hidden: (p) => !p.active,
  };
  const list = base.filter(test[f]);
  const shown = list.slice((page - 1) * PAGE, page * PAGE);
  const pages = Math.max(1, Math.ceil(list.length / PAGE));

  const href = (o: Partial<SP>) => {
    const p = new URLSearchParams();
    const v = { q, sec, f, page: "1", ...o };
    if (v.q) p.set("q", v.q);
    if (v.sec) p.set("sec", v.sec);
    if (v.f && v.f !== "all") p.set("f", v.f);
    if (v.page && v.page !== "1") p.set("page", v.page);
    const s = p.toString();
    return `/admin/products${s ? "?" + s : ""}`;
  };
  const here = href({ page: String(page) });

  return (
    <div className="wrap admin">
      <AdminNav active="products" />

      <div className="atool">
        <form className="asearch" action="/admin/products">
          {sec && <input type="hidden" name="sec" value={sec} />}
          {f !== "all" && <input type="hidden" name="f" value={f} />}
          <input name="q" defaultValue={q} placeholder="Search name, brand or code" aria-label="Search products" />
          <select name="sec" defaultValue={sec} aria-label="Section">
            <option value="">All sections</option>
            {SECTIONS.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}
          </select>
          <button className="btn btn-sm">Search</button>
          {(q || sec) && <Link className="clear" href={href({ q: "", sec: "" })}>Clear</Link>}
        </form>
        <Link className="btn btn-sm btn-yellow" href={`/admin/products/new?returnTo=${encodeURIComponent(here)}`}>+ Add product</Link>
      </div>

      <div className="chips">
        {FILTERS.map(([k, label]) => (
          <Link key={k} className="chip" aria-pressed={f === k} href={href({ f: k })}>
            {label} <b>{base.filter(test[k]).length}</b>
          </Link>
        ))}
      </div>

      <p className="acount">{list.length} {list.length === 1 ? "product" : "products"}{pages > 1 && ` · page ${page} of ${pages}`}.</p>

      <div className="alist">
        {shown.map((p) => (
          <form key={p.id} action={quickSave} className={`arow ${p.active ? "" : "off"}`}>
            <input type="hidden" name="id" value={p.id} />
            <Link className="ath" href={`/admin/products/${p.id}?returnTo=${encodeURIComponent(here)}`}>{p.thumb && <img src={p.thumb} alt="" loading="lazy" />}</Link>
            <div className="aname">
              <Link href={`/admin/products/${p.id}?returnTo=${encodeURIComponent(here)}`}><b>{p.name}</b></Link>
              <span>{[p.brand, p.size, p.sku && `#${p.sku}`].filter(Boolean).join(" · ")}{!p.active && " · Hidden"}</span>
            </div>
            <label className="af af1"><span>Price $</span><input name="price" defaultValue={dollars(p.price)} inputMode="decimal" required /></label>
            <label className="af af2"><span>Usual $</span><input name="was" defaultValue={p.was > p.price ? dollars(p.was) : ""} inputMode="decimal" placeholder="—" /></label>
            <label className="ac ac1"><input type="checkbox" className="check" name="inStock" defaultChecked={p.inStock} />In stock</label>
            <label className="ac ac2"><input type="checkbox" className="check" name="active" defaultChecked={p.active} />Shown</label>
            <button className="btn btn-sm">Save</button>
          </form>
        ))}
        {!shown.length && <p className="empty">No products match. <Link className="u" href={href({ q: "", sec: "", f: "all" })}>Show all</Link></p>}
      </div>

      {pages > 1 && (
        <div className="apager">
          {page > 1 && <Link className="btn btn-sm btn-line" href={href({ page: String(page - 1) })}>← Previous</Link>}
          <span>Page {page} of {pages}</span>
          {page < pages && <Link className="btn btn-sm btn-line" href={href({ page: String(page + 1) })}>Next →</Link>}
        </div>
      )}
    </div>
  );
}

"use client";
import { useEffect, useMemo, useState } from "react";
import type { ProductLite } from "@/lib/types";
import { ProductCard } from "./ProductCard";
import { IconClose } from "./Icons";

const PRICES: [string, number, number][] = [
  ["Under $30", 0, 3000], ["$30 – $60", 3000, 6000], ["$60 – $100", 6000, 10000], ["$100 – $200", 10000, 20000], ["$200 and up", 20000, 1e12],
];
const PAGE = 24;
type Sort = "pop" | "lo" | "hi" | "az";
type State = { brands: string[]; prices: number[]; sizes: string[]; stock: boolean; sort: Sort };
const EMPTY: State = { brands: [], prices: [], sizes: [], stock: false, sort: "pop" };

function readUrl(): State {
  const q = new URLSearchParams(location.search);
  return {
    brands: q.getAll("brand"), sizes: q.getAll("size"),
    prices: q.getAll("price").map(Number).filter((n) => PRICES[n]),
    stock: q.get("stock") === "1", sort: (["lo", "hi", "az"].includes(q.get("sort") || "") ? q.get("sort") : "pop") as Sort,
  };
}
function writeUrl(s: State) {
  const q = new URLSearchParams(location.search);
  ["brand", "size", "price", "stock", "sort"].forEach((k) => q.delete(k));
  s.brands.forEach((b) => q.append("brand", b));
  s.sizes.forEach((z) => q.append("size", z));
  s.prices.forEach((p) => q.append("price", String(p)));
  if (s.stock) q.set("stock", "1");
  if (s.sort !== "pop") q.set("sort", s.sort);
  const qs = q.toString();
  history.replaceState(history.state, "", location.pathname + (qs ? "?" + qs : ""));
}

const tally = (list: ProductLite[], key: "brand" | "size") => {
  const m = new Map<string, number>();
  list.forEach((p) => p[key] && m.set(p[key], (m.get(p[key]) || 0) + 1));
  return [...m].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
};

export function CategoryBrowser({ products }: { products: ProductLite[] }) {
  const [st, setSt] = useState<State>(EMPTY);
  const [shown, setShown] = useState(PAGE);
  const [sheet, setSheet] = useState(false);
  const [bq, setBq] = useState("");
  const [allBrands, setAllBrands] = useState(false);

  // Filters live in the address bar so Back, refresh and shared links keep them.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setSt(readUrl()); }, []);
  const update = (s: Partial<State>) => { const n = { ...st, ...s }; setSt(n); setShown(PAGE); writeUrl(n); };
  const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const pass = (p: ProductLite, skip?: "b" | "p" | "z") =>
    (skip === "b" || !st.brands.length || st.brands.includes(p.brand)) &&
    (skip === "p" || !st.prices.length || st.prices.some((i) => p.price >= PRICES[i][1] && p.price < PRICES[i][2])) &&
    (skip === "z" || !st.sizes.length || st.sizes.includes(p.size)) &&
    (!st.stock || p.inStock);

  const results = useMemo(() => {
    const r = products.filter((p) => pass(p));
    const by: Record<Sort, (a: ProductLite, b: ProductLite) => number> = {
      pop: (a, b) => a.rank - b.rank, lo: (a, b) => a.price - b.price, hi: (a, b) => b.price - a.price, az: (a, b) => a.name.localeCompare(b.name),
    };
    return r.sort((a, b) => Number(b.inStock) - Number(a.inStock) || by[st.sort](a, b));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, st]);

  const brands = tally(products.filter((p) => pass(p, "b")), "brand");
  const sizes = tally(products.filter((p) => pass(p, "z")), "size").slice(0, 10);
  const priced = products.filter((p) => pass(p, "p"));
  const nf = st.brands.length + st.prices.length + st.sizes.length + (st.stock ? 1 : 0);
  const shownBrands = bq ? brands.filter(([b]) => b.toLowerCase().includes(bq.toLowerCase())) : allBrands ? brands : brands.slice(0, 8);
  const page = results.slice(0, shown);

  const filters = (
    <>
      <div className="fgroup">
        <div className="switch">In stock only <button className="tog" role="switch" aria-checked={st.stock} aria-label="In stock only" onClick={() => update({ stock: !st.stock })} /></div>
      </div>
      {brands.length > 1 && (
        <div className="fgroup">
          <h4>Brand <span>{brands.length}</span></h4>
          {brands.length > 8 && <input className="bsearch" placeholder="Find a brand" value={bq} onChange={(e) => setBq(e.target.value)} aria-label="Find a brand" />}
          {shownBrands.map(([b, n]) => (
            <label key={b}><input type="checkbox" className="check" checked={st.brands.includes(b)} onChange={() => update({ brands: toggle(st.brands, b) })} />{b}<span>{n}</span></label>
          ))}
          {!bq && !allBrands && brands.length > 8 && <button className="more" onClick={() => setAllBrands(true)}>Show all {brands.length} brands</button>}
        </div>
      )}
      <div className="fgroup">
        <h4>Price</h4>
        {PRICES.map(([label, lo, hi], i) => {
          const n = priced.filter((p) => p.price >= lo && p.price < hi).length;
          return n || st.prices.includes(i) ? (
            <label key={label}><input type="checkbox" className="check" checked={st.prices.includes(i)} onChange={() => update({ prices: toggle(st.prices, i) })} />{label}<span>{n}</span></label>
          ) : null;
        })}
      </div>
      {sizes.length > 1 && (
        <div className="fgroup">
          <h4>Size</h4>
          {sizes.map(([z, n]) => (
            <label key={z}><input type="checkbox" className="check" checked={st.sizes.includes(z)} onChange={() => update({ sizes: toggle(st.sizes, z) })} />{z}<span>{n}</span></label>
          ))}
        </div>
      )}
    </>
  );

  const chips: [string, () => void][] = [
    ...st.brands.map((b) => [b, () => update({ brands: toggle(st.brands, b) })] as [string, () => void]),
    ...st.prices.map((i) => [PRICES[i][0], () => update({ prices: toggle(st.prices, i) })] as [string, () => void]),
    ...st.sizes.map((z) => [z, () => update({ sizes: toggle(st.sizes, z) })] as [string, () => void]),
    ...(st.stock ? [["In stock", () => update({ stock: false })] as [string, () => void]] : []),
  ];

  return (
    <div className="layout">
      <aside className="filters" aria-label="Filters">{filters}</aside>
      <section>
        <div className="toolbar">
          <button className="fbtn" onClick={() => setSheet(true)}>Filter <b>{nf}</b></button>
          <span className="res">{results.length} {results.length === 1 ? "product" : "products"}{nf ? " match your filters" : ""}</span>
          <select className="sel" value={st.sort} onChange={(e) => update({ sort: e.target.value as Sort })} aria-label="Sort">
            <option value="pop">Sort: Best selling</option>
            <option value="lo">Price: low to high</option>
            <option value="hi">Price: high to low</option>
            <option value="az">Name: A to Z</option>
          </select>
        </div>
        {chips.length > 0 && (
          <div className="active">
            {chips.map(([l, f]) => <button key={l} className="achip" onClick={f}>{l} ✕</button>)}
            <button className="clear" onClick={() => update({ ...EMPTY, sort: st.sort })}>Clear all</button>
          </div>
        )}
        <div className="grid">
          {page.length ? page.map((p, i) => <ProductCard key={p.id} p={p} eager={i < 8} />) : (
            <div className="empty" style={{ gridColumn: "1/-1" }}>No products match. <button className="clear" onClick={() => update({ ...EMPTY, sort: st.sort })}>Clear filters</button></div>
          )}
        </div>
        <div className="loadmore">
          {results.length > shown ? (
            <>
              <span>Showing {page.length} of {results.length}</span>
              <div className="lbar"><i style={{ width: `${(page.length / results.length) * 100}%` }} /></div>
              <button className="btn" onClick={() => setShown(shown + PAGE)}>Load more</button>
            </>
          ) : results.length > 0 && <span>Showing all {results.length}</span>}
        </div>
      </section>

      <div className={`scrim ${sheet ? "on" : ""}`} onClick={() => setSheet(false)} />
      <div className={`fsheet ${sheet ? "on" : ""}`} aria-label="Filters" aria-hidden={!sheet} inert={!sheet}>
        <div className="top"><h3>Filters</h3><button className="icon-btn" aria-label="Close filters" onClick={() => setSheet(false)}><IconClose /></button></div>
        <div className="inner">{filters}</div>
        <div className="foot">
          <button className="btn btn-line" onClick={() => update({ ...EMPTY, sort: st.sort })}>Clear</button>
          <button className="btn" onClick={() => setSheet(false)}>Show {results.length} results</button>
        </div>
      </div>
    </div>
  );
}

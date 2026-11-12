"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { money } from "@/lib/money";
import { IconSearch } from "./Icons";

type Item = { s: string; n: string; b: string; t: string; p: number; k: number };
type Cat = { name: string; href: string };
let INDEX: Promise<Item[]> | null = null;
const loadIndex = () => (INDEX ??= fetch("/api/search").then((r) => r.json()));

export function SearchBox({ cats }: { cats: Cat[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [open, setOpen] = useState(false);
  const [hl, setHl] = useState(-1);
  const box = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const match = (s: string) => words.every((w) => s.toLowerCase().includes(w));
  const show = open && q.trim().length >= 2;
  const catHits = show ? cats.filter((c) => match(c.name)).slice(0, 3) : [];
  const brandHits = show ? [...new Map(items.filter((i) => match(i.b)).map((i) => [i.b, 0])).keys()].slice(0, 3) : [];
  const prodHits = show ? items.filter((i) => match(`${i.n} ${i.b}`)).sort((a, b) => b.k - a.k).slice(0, 6) : [];
  const links = [...catHits.map((c) => c.href), ...brandHits.map((b) => `/search?q=${encodeURIComponent(b)}`), ...prodHits.map((p) => `/p/${p.s}`)];

  const go = (href: string) => { setOpen(false); setQ(""); router.push(href); };

  return (
    <form ref={box} className="search" role="search" onSubmit={(e) => {
      e.preventDefault();
      if (hl >= 0 && links[hl]) return go(links[hl]);
      if (q.trim()) go(`/search?q=${encodeURIComponent(q.trim())}`);
    }}>
      <IconSearch />
      <input
        value={q} placeholder="Search 500+ drinks, brands…" aria-label="Search drinks" enterKeyHint="search"
        onFocus={() => { loadIndex().then(setItems); setOpen(true); }}
        onChange={(e) => { setQ(e.target.value); setOpen(true); setHl(-1); }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setHl((h) => Math.min(links.length - 1, h + 1)); }
          if (e.key === "ArrowUp") { e.preventDefault(); setHl((h) => Math.max(-1, h - 1)); }
          if (e.key === "Escape") setOpen(false);
        }}
      />
      {show && (
        <div className="suggest">
          {catHits.length > 0 && <><h5>Categories</h5>{catHits.map((c, i) => <Link key={c.href} href={c.href} className={hl === i ? "hl" : ""} onClick={() => go(c.href)}>{c.name}</Link>)}</>}
          {brandHits.length > 0 && <><h5>Brands</h5>{brandHits.map((b, i) => <Link key={b} href={`/search?q=${encodeURIComponent(b)}`} className={hl === catHits.length + i ? "hl" : ""} onClick={() => setOpen(false)}>{b}</Link>)}</>}
          {prodHits.length > 0 && <><h5>Products</h5>{prodHits.map((p, i) => (
            <Link key={p.s} href={`/p/${p.s}`} className={hl === catHits.length + brandHits.length + i ? "hl" : ""} onClick={() => go(`/p/${p.s}`)}>
              {p.t && <img src={p.t} alt="" />}<span>{p.n}{!p.k && " · sold out"}</span><b>{money(p.p)}</b>
            </Link>))}</>}
          {links.length === 0 ? <h5>No matches for “{q}”</h5> : <Link className="all" href={`/search?q=${encodeURIComponent(q.trim())}`} onClick={() => setOpen(false)}>See all results for “{q.trim()}”</Link>}
        </div>
      )}
    </form>
  );
}

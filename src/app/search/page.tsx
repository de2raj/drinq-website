import type { Metadata } from "next";
import Link from "next/link";
import { CategoryBrowser } from "@/components/CategoryBrowser";
import { lite, search } from "@/lib/catalogue";

export const metadata: Metadata = { title: "Search", robots: { index: false } };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = String((await searchParams).q ?? "").trim().slice(0, 80);
  const results = q ? (await search(q)).map(lite) : [];
  return (
    <div className="wrap">
      <div className="crumbs"><Link href="/">Home</Link> / Search</div>
      <div className="chero">
        <div><h1 className="display">{q ? `“${q}”` : "Search"}</h1><p>{q ? `${results.length} ${results.length === 1 ? "product" : "products"} found.` : "Type in the search box above to find a drink or brand."}</p></div>
      </div>
      {q && results.length === 0 && (
        <div className="notice">Nothing matched “{q}”. Try a brand name, a type like “gin”, or browse <Link className="u" href="/spirits">Spirits</Link> and <Link className="u" href="/whisky">Whisky</Link>.</div>
      )}
      {results.length > 0 && <CategoryBrowser key={q} products={results} />}
    </div>
  );
}

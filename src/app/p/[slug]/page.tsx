import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BuyBox } from "@/components/BuyBox";
import { ProductCard } from "@/components/ProductCard";
import { allProducts, inSub, lite, productBySlug, sectionOf } from "@/lib/catalogue";
import { freeGoals } from "@/lib/delivery";
import { pointsFor } from "@/lib/loyalty";
import { money } from "@/lib/money";
import { getSetting } from "@/lib/settings";

type P = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const p = await productBySlug((await params).slug);
  if (!p) return {};
  return { title: p.name, description: `${p.name} — ${money(p.price)}. Delivered across Singapore by DRINQ.`, openGraph: { images: p.image ? [p.image] : [] } };
}

export default async function ProductPage({ params }: P) {
  const p = await productBySlug((await params).slug);
  if (!p) notFound();
  const { section, sub } = sectionOf(p);
  // "Nose: honey, vanilla" → ["Nose", "honey, vanilla"]
  const notes = p.tastingNotes.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
    const m = l.match(/^([A-Za-z ]{2,20}):\s*(.+)$/);
    return m ? [m[1], m[2]] : ["", l];
  });
  const [loyalty, delivery] = await Promise.all([getSetting("loyalty"), getSetting("delivery")]);
  const earn = loyalty.enabled ? pointsFor(p.price, loyalty) : 0;
  const free = freeGoals(delivery)[0];
  const off = p.was > p.price ? Math.round((1 - p.price / p.was) * 100) : 0;
  const related = (await allProducts())
    .filter((x) => x.id !== p.id && x.inStock && (sub ? inSub(x, sub) : x.categories.some((c) => p.categories.includes(c))))
    .sort((a, b) => Number(b.brand === p.brand) - Number(a.brand === p.brand) || a.rank - b.rank)
    .slice(0, 10).map(lite);

  return (
    <div className="wrap">
      <div className="crumbs">
        <Link href="/">Home</Link>
        {section && <> / <Link href={`/${section.slug}`}>{section.name}</Link></>}
        {section && sub && <> / <Link href={`/${section.slug}/${sub.slug}`}>{sub.name}</Link></>}
      </div>
      <div className="pdp pdp2">
        <div className="pic">
          {off > 0 && <span className="tag">-{off}%</span>}
          {p.giftBox && <span className="gtag">Gift box</span>}
          {p.image && <img src={p.image} alt={p.name} />}
        </div>
        <div className="pmain">
          <Link className="brand" href={section ? `/${section.slug}?brand=${encodeURIComponent(p.brand)}` : "/"}>{p.brand}</Link>
          <h1>{p.name}</h1>
          <div className="pmeta">
            <span className={`stock ${p.inStock ? "" : "out"}`}><i />{p.inStock ? "In stock" : "Sold out"}</span>
            {p.size && <span>{p.size}</span>}
            {p.abv != null && p.abv > 0 && <span>{p.abv}% ABV</span>}
            {p.origin && <span>{p.origin}</span>}
          </div>
          <div className="pprice">{money(p.price)}{off > 0 && <><s>{money(p.was)}</s><em>Save {off}%</em></>}</div>
          {earn > 0 && <p className="pearn"><span>P</span><b>{earn} loyalty points</b> with this bottle</p>}
          <BuyBox p={lite(p)} />
          {free && <p className="pfree"><span>🚚</span>Free {free.label} on orders from {money(free.threshold)}</p>}

          <details className="acc" open>
            <summary>Characteristics</summary>
            <dl className="chars">
              {p.abv != null && p.abv > 0 && <div><dt>Alcohol percentage</dt><dd>{p.abv}%</dd></div>}
              {p.size && <div><dt>Volume</dt><dd>{p.size}</dd></div>}
              <div><dt>Brand</dt><dd>{section ? <Link href={`/${section.slug}?brand=${encodeURIComponent(p.brand)}`}>{p.brand}</Link> : p.brand}</dd></div>
              <div><dt>Gift box</dt><dd>{p.giftBox ? "Yes" : "No"}</dd></div>
              {p.origin && <div><dt>Country of origin</dt><dd>{p.origin}</dd></div>}
              {p.specs.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
              {section && <div><dt>Category</dt><dd><Link href={sub ? `/${section.slug}/${sub.slug}` : `/${section.slug}`}>{sub ? sub.name : section.name}</Link></dd></div>}
              {p.sku && <div><dt>Product code</dt><dd>{p.sku}</dd></div>}
            </dl>
          </details>
          {p.description && (
            <details className="acc" open>
              <summary>Description</summary>
              <div className="dtext">{p.description.split(/\n{2,}/).map((t, i) => <p key={i}>{t}</p>)}</div>
            </details>
          )}
          {notes.length > 0 && (
            <details className="acc" open>
              <summary>Tasting notes</summary>
              <dl className="chars">{notes.map(([k, v], i) => <div key={i}>{k ? <><dt>{k}</dt><dd>{v}</dd></> : <dd>{v}</dd>}</div>)}</dl>
            </details>
          )}
          <details className="acc">
            <summary>Delivery &amp; payment</summary>
            <ul className="dlist">
              <li><b>Next-day, same-day, 2-hour express or a 3-hour time slot.</b> Or collect it yourself. <Link href="/delivery">How delivery works</Link></li>
              <li><b>Secure payment</b> by PayNow QR, cards, Apple Pay or Google Pay.</li>
              <li><b>18+ only.</b> We check ID on delivery or collection.</li>
            </ul>
          </details>
        </div>
      </div>
      {related.length > 0 && (
        <section style={{ paddingBottom: 24 }}>
          <div className="head-row"><h2 className="display">You may also like</h2>{section && <Link href={sub && section ? `/${section.slug}/${sub.slug}` : `/${section.slug}`}>See all</Link>}</div>
          <div className="rowscroll">{related.map((r) => <ProductCard key={r.id} p={r} />)}</div>
        </section>
      )}
    </div>
  );
}

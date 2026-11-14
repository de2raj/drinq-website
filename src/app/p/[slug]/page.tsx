import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BuyBox } from "@/components/BuyBox";
import { ProductCard } from "@/components/ProductCard";
import { allProducts, inSub, lite, productBySlug, sectionOf } from "@/lib/catalogue";
import { SHOP } from "@/lib/config";
import { money } from "@/lib/money";

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
      <div className="pdp">
        <div className="pic">
          {off > 0 && <span className="tag">-{off}%</span>}
          {p.image && <img src={p.image} alt={p.name} />}
        </div>
        <div>
          <span className="brand">{p.brand}</span>
          <h1>{p.name}</h1>
          <span className={`stock ${p.inStock ? "" : "out"}`}><i />{p.inStock ? "In stock, ready to deliver" : "Sold out"}</span>
          <div className="pprice">{money(p.price)}{off > 0 && <s>{money(p.was)}</s>}</div>
          <p style={{ fontWeight: 500 }}>Price in SGD, nett.</p>
          <BuyBox p={lite(p)} />
          <dl className="facts-list">
            <div><dt>Brand</dt><dd>{p.brand}</dd></div>
            {p.size && <div><dt>Size</dt><dd>{p.size}</dd></div>}
            {section && <div><dt>Category</dt><dd>{sub ? `${sub.name} · ${section.name}` : section.name}</dd></div>}
            {p.sku && <div><dt>Product code</dt><dd>{p.sku}</dd></div>}
          </dl>
          <div className="perks">
            <div><span className="ic">🚚</span><span><b>Delivery 7 days a week</b>Free over {money(SHOP.freeDeliveryFrom)}, otherwise {money(SHOP.deliveryFee)}.</span></div>
            <div><span className="ic">🔒</span><span><b>Secure payment</b>PayNow QR, cards, Apple Pay or Google Pay.</span></div>
            <div><span className="ic">🪪</span><span><b>18+ only</b>We check ID at the door.</span></div>
          </div>
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

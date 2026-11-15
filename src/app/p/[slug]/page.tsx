import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BuyBox } from "@/components/BuyBox";
import { ProductCard } from "@/components/ProductCard";
import { ReadMore } from "@/components/ReadMore";
import { allProducts, inSub, lite, productBySlug, sectionOf } from "@/lib/catalogue";
import { freeGoals } from "@/lib/delivery";
import { money } from "@/lib/money";
import { getSetting } from "@/lib/settings";

const svg = (d: React.ReactNode) => <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>;
const TRUCK = svg(<><path d="M3 6h11v10H3z" /><path d="M14 9h4l3 3v4h-7" /><circle cx="7" cy="17.5" r="1.8" /><circle cx="17" cy="17.5" r="1.8" /></>);
const STORE = svg(<><path d="M4 10v10h16V10" /><path d="M3 10l2-6h14l2 6z" /><path d="M10 20v-5h4v5" /></>);
const CARD = svg(<><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18M7 15h4" /></>);
const NOTE_ICON: Record<string, React.ReactNode> = {
  taste: svg(<><path d="M7 3h10l-1 7a4 4 0 0 1-8 0z" /><path d="M12 14v6M8 21h8" /></>),
  palate: svg(<><path d="M7 3h10l-1 7a4 4 0 0 1-8 0z" /><path d="M12 14v6M8 21h8" /></>),
  nose: svg(<><path d="M5 9c2-2 4-2 6 0s4 2 6 0" /><path d="M5 14c2-2 4-2 6 0s4 2 6 0" /><path d="M8 19c1.5-1.2 3-1.2 4.5 0" /></>),
  finish: svg(<><path d="M7 3h10M7 21h10" /><path d="M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9" /></>),
};

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
  const free = freeGoals(delivery)[0];
  // The four facts that matter most, then the rest as chips.
  const colour = p.specs.find(([k]) => /colou?r/i.test(k))?.[1];
  const facts = ([
    ["Alcohol", p.abv != null && p.abv > 0 ? `${p.abv}%` : ""],
    ["Volume", p.size],
    ["Origin", p.origin],
    ["Colour", colour ?? ""],
  ] as [string, string][]).filter(([, v]) => v);
  const extra = p.specs.filter(([k]) => !/colou?r/i.test(k));
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
          <span className={`stock ${p.inStock ? "" : "out"}`}><i />{p.inStock ? "In stock" : "Sold out"}</span>
          <div className="pprice">{money(p.price)}{off > 0 && <><s>{money(p.was)}</s><em>Save {off}%</em></>}</div>
          <BuyBox p={lite(p)} earnRate={loyalty.enabled ? loyalty.earnPerDollar : 0} />
          {free && <p className="pfree"><span>🚚</span>Free {free.label} on orders from {money(free.threshold)}</p>}

          <section className="glance">
            <h3>At a glance</h3>
            <div className="gl">
              {facts.map(([k, v]) => <div key={k}><small>{k}</small><b>{v}</b></div>)}
            </div>
          </section>
          <div className="pchips">
            {section && <Link className="pchip" href={sub ? `/${section.slug}/${sub.slug}` : `/${section.slug}`}>{sub ? `${sub.name} ${section.name === "Whisky" ? "whisky" : ""}`.trim() : section.name}</Link>}
            <Link className="pchip" href={section ? `/${section.slug}?brand=${encodeURIComponent(p.brand)}` : "/"}>{p.brand}</Link>
            <span className="pchip">{p.giftBox ? "Comes in a gift box" : "No gift box"}</span>
            {extra.map(([k, v]) => <span key={k} className="pchip">{k}: {v}</span>)}
          </div>
          {p.description && <ReadMore paras={p.description.split(/\n{2,}/)} />}
          {p.sku && <p className="pcode">Product code {p.sku}</p>}
          <div className="perks3">
            <div><span className="di">{TRUCK}</span><p><b>Delivered your way</b>Next-day, same-day, express or a 3-hour slot. <Link href="/delivery">Details</Link></p></div>
            <div><span className="di">{STORE}</span><p><b>Free self-collection</b>65 Ubi Road 1, Oxley Bizhub</p></div>
            <div><span className="di">{CARD}</span><p><b>Secure payment</b>PayNow, cards, Apple Pay &amp; Google Pay</p></div>
          </div>
        </div>
      </div>
      {notes.length > 0 && (
        <section className="tnotes">
          <h2>Tasting notes</h2>
          <div className="tgrid">
            {notes.map(([k, v], i) => (
              <div key={i}><span className="ti">{NOTE_ICON[k.toLowerCase()] ?? NOTE_ICON.taste}</span><p><b>{k || "Notes"}</b>{v}</p></div>
            ))}
          </div>
        </section>
      )}
      {related.length > 0 && (
        <section style={{ paddingBottom: 24 }}>
          <div className="head-row"><h2 className="display">You may also like</h2>{section && <Link href={sub && section ? `/${section.slug}/${sub.slug}` : `/${section.slug}`}>See all</Link>}</div>
          <div className="rowscroll">{related.map((r) => <ProductCard key={r.id} p={r} />)}</div>
        </section>
      )}
    </div>
  );
}

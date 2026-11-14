import Link from "next/link";
import { IconTelegram } from "@/components/Icons";
import { ProductCard } from "@/components/ProductCard";
import { allProducts, inSection, lite, menu, sectionProducts } from "@/lib/catalogue";
import { SHOP } from "@/lib/config";
import { findSection } from "@/lib/sections";
import { getSetting } from "@/lib/settings";

export default async function Home() {
  const all = await allProducts();
  const best = all.filter((p) => p.inStock).slice(0, 10).map(lite);
  const deals = (await sectionProducts(findSection("deals")!)).filter((p) => p.inStock).slice(0, 10).map(lite);
  const sections = (await menu()).filter((s) => !s.deal);
  const store = await getSetting("store");
  // Homepage bottles: chosen in Admin → Settings → Homepage.
  const heroes = store.heroSlugs.map((s) => all.find((p) => p.slug === s && p.image)).filter((p) => !!p).slice(0, 3);
  const pics = Object.fromEntries(sections.map((s) => [s.slug, all.find((p) => p.inStock && p.thumb && inSection(p, findSection(s.slug)!))?.thumb]));
  const tilePic = (slug: string) => pics[slug];

  return (
    <>
      <section className="hero">
        <div className="wrap">
          <div>
            <span className="eyebrow"><i />Same-day delivery · order by 11am</span>
            <h1 className="display">Drinks to<br />your door.<br /><em>Fast.</em></h1>
            <p className="lead">Spirits, wine, beer and mixers at honest prices, delivered across Singapore.</p>
            <div className="ctas">
              <Link className="btn" href="/whisky">Shop now →</Link>
              <a className="btn btn-line" href={SHOP.telegramUrl} target="_blank" rel="noopener">Order on Telegram</a>
            </div>
            <div className="facts">
              <div><b>{all.length}+</b>drinks to choose from</div>
              <div><b>2 hrs</b>express delivery</div>
              <div><b>$200*</b>free delivery from</div>
            </div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="disc">
              <div className={`bottles n${heroes.length}`}>{heroes.map((p) => <img key={p.id} src={p.image} alt="" />)}</div>
            </div>
            {deals.length > 0 && <Link className="sticker" href="/deals"><div><b>{deals.length}</b>deals<br />this week</div></Link>}
          </div>
        </div>
      </section>

      <div className="marquee" aria-hidden="true">
        <div className="track">
          {[0, 1].map((k) => ["Whisky", "Gin", "Champagne", "Red wine", "Craft beer", "Soju", "Tequila", "Cocktail syrups"].map((t) => <span key={k + t}>{t}</span>))}
        </div>
      </div>

      <section className="block">
        <div className="wrap">
          <div className="head-row"><h2 className="display">Shop by type</h2></div>
          <div className="tiles">
            {sections.map((s) => (
              <Link key={s.slug} className="tile" href={`/${s.slug}`}>
                {tilePic(s.slug) && <img src={tilePic(s.slug)} alt="" />}
                <span>{s.name}</span><small>{s.count} items</small>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="block" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="head-row"><h2 className="display">Best sellers</h2><Link href="/whisky">Shop all drinks</Link></div>
          <div className="rowscroll">{best.map((p, i) => <ProductCard key={p.id} p={p} eager={i < 5} />)}</div>
        </div>
      </section>

      {deals.length > 0 && (
        <section style={{ paddingBottom: 64 }}>
          <div className="wrap">
            <div className="deal">
              <div>
                <h2 className="display">This week&apos;s<br />deals</h2>
                <p>Promotions across spirits, beer and mixers. Prices already include the discount.</p>
                <Link className="btn btn-yellow" href="/deals">See all deals →</Link>
              </div>
              <div className="big">{deals.length}<small>deals live now</small></div>
            </div>
            <div className="rowscroll" style={{ marginTop: 18 }}>{deals.map((p) => <ProductCard key={p.id} p={p} />)}</div>
          </div>
        </section>
      )}

      <section className="block" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="head-row"><h2 className="display">How it works</h2></div>
          <div className="steps">
            <div className="step"><div className="n">1</div><h3>Pick your drinks</h3><p>Browse {all.length}+ products with live prices and stock.</p></div>
            <div className="step"><div className="n">2</div><h3>Pay securely</h3><p>PayNow QR, cards, Apple Pay or Google Pay.</p></div>
            <div className="step"><div className="n">3</div><h3>Get it delivered</h3><p>Choose a time slot. ID is checked at the door, 18+ only.</p></div>
          </div>
        </div>
      </section>

      <section>
        <div className="wrap">
          <div className="tg">
            <div style={{ display: "flex", gap: 22, alignItems: "center", flexWrap: "wrap" }}>
              <div className="tg-ico"><IconTelegram /></div>
              <div><h2 className="display" style={{ fontSize: "clamp(26px,3.6vw,38px)" }}>Prefer to chat?</h2><p>Message us on Telegram for quick orders, big events or anything not on the site.</p></div>
            </div>
            <a className="btn" href={SHOP.telegramUrl} target="_blank" rel="noopener">Open Telegram →</a>
          </div>
        </div>
      </section>
    </>
  );
}

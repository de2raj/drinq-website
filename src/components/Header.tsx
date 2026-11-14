"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { Menu } from "@/lib/catalogue";
import { useCart } from "./CartProvider";
import { CartDrawer, FreeDeliveryBar } from "./CartDrawer";
import { IconBag, IconClose, IconMenu } from "./Icons";
import { SearchBox } from "./SearchBox";

export type HeaderMember = { first: string; points: number } | null;

export function Header({ menu, announcement, member }: { menu: Menu; announcement: string; member: HeaderMember }) {
  const { count, setOpen, ready, subtotal, tiers } = useCart();
  const [side, setSide] = useState(false);
  const [sub, setSub] = useState<string | null>(null);
  const [hoverOff, setHoverOff] = useState(false);
  const path = usePathname();
  const current = path.split("/")[1];
  // Close menus after navigating (and let the desktop dropdown close on click).
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setSide(false); setSub(null); setHoverOff(true); }, [path]);
  useEffect(() => {
    if (!side) return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") { if (sub) setSub(null); else setSide(false); } };
    addEventListener("keydown", esc);
    return () => removeEventListener("keydown", esc);
  }, [side, sub]);

  const ordered = [...menu].sort((a, b) => Number(b.deal) - Number(a.deal)); // Deals first
  const cats = menu.flatMap((s) => [{ name: s.name, href: `/${s.slug}` }, ...s.subs.map((x) => ({ name: `${x.name} · ${s.name}`, href: `/${s.slug}/${x.slug}` }))]);

  return (
    <>
      {ready && count > 0 && tiers.length ? (
        <div className="strip prog"><FreeDeliveryBar subtotal={subtotal} /></div>
      ) : (
        <div className="strip">{announcement.split(" · ").map((part, i) => <span key={i} className={i ? "sd" : ""}>{i ? " · " : ""}{part}</span>)}</div>
      )}
      <header className="hdr">
        <div className="wrap hbar">
          <button className="icon-btn menu-btn" aria-label="Menu" onClick={() => setSide(true)}><IconMenu /></button>
          <Link className="logo" href="/"><img src="/drinq-logo-black.png" alt="DRINQ" width={115} height={32} /></Link>
          <SearchBox cats={cats} />
          <Link className="acct" href="/account" aria-label={member ? `My account, ${member.points} points` : "Sign in"}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></svg>
            <span className="acct-t">{member ? (member.points ? <><b>{member.points}</b> pts</> : member.first) : "Sign in"}</span>
          </Link>
          <button className="icon-btn cart-btn" aria-label={`Cart, ${count} items`} onClick={() => setOpen(true)}>
            <IconBag />{ready && <span className="badge">{count}</span>}
          </button>
        </div>
        <div className="wrap msearch"><SearchBox cats={cats} /></div>
        <nav className="cats wrap" aria-label="Categories" onMouseMove={() => hoverOff && setHoverOff(false)}>
          {ordered.map((s) => (
            <div className="item" key={s.slug}>
              <Link className={`top ${s.deal ? "hot" : ""} ${current === s.slug ? "on" : ""}`} href={`/${s.slug}`}>
                {s.deal ? <i className="pdeal">%</i> : <i>{s.pic && <img src={s.pic} alt="" />}</i>}{s.name}{s.deal && <span>{s.count}</span>}
              </Link>
              {!s.deal && !hoverOff && (
                <div className="mega">
                  <div className="wrap">
                    <div><h6>{s.name}</h6>
                      <Link href={`/${s.slug}`}>Shop all <span>{s.count}</span></Link>
                      {s.subs.map((x) => <Link key={x.slug} href={`/${s.slug}/${x.slug}`}>{x.name} <span>{x.count}</span></Link>)}
                    </div>
                    <div><h6>Top brands</h6>
                      {s.brands.map(([b, n]) => <Link key={b} href={`/${s.slug}?brand=${encodeURIComponent(b)}`}>{b} <span>{n}</span></Link>)}
                    </div>
                    <div><h6>Popular sizes</h6>
                      {s.sizes.map(([z, n]) => <Link key={z} href={`/${s.slug}?size=${encodeURIComponent(z)}`}>{z} <span>{n}</span></Link>)}
                    </div>
                    <div className="promo"><h6>Deals this week</h6><p>Promotions and bundle prices across the shop.</p><Link className="btn btn-sm" href="/deals" style={{ display: "inline-flex" }}>See deals →</Link></div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </nav>
      </header>

      <div className={`scrim ${side ? "on" : ""}`} onClick={() => { setSide(false); setSub(null); }} />
      <aside className={`side ${side ? "on" : ""}`} aria-label="Menu" aria-hidden={!side} inert={!side}>
        <div className="top">
          <img src="/drinq-logo-black.png" alt="DRINQ" style={{ height: 24, width: "auto" }} />
          <button className="icon-btn" aria-label="Close menu" onClick={() => setSide(false)}><IconClose /></button>
        </div>
        <Link className="me" href="/account">
          <span className="av">{member ? member.first.slice(0, 1).toUpperCase() : "★"}</span>
          <span className="mt"><b>{member ? `Hi ${member.first}` : "Sign in / Create account"}</b><small>{member ? `${member.points} points` : "Earn points on every order"}</small></span>
          <span className="pill">{member ? "My account" : "Sign in"}</span>
        </Link>
        <nav className="mlist" aria-label="Categories">
          {ordered.map((s) => s.deal ? (
            <Link key={s.slug} href={`/${s.slug}`} className="hot">
              <span className="th deal">%</span><span className="nm">Deals<small>{s.count} offers</small></span><span className="chev">›</span>
            </Link>
          ) : (
            <button key={s.slug} type="button" onClick={() => setSub(s.slug)} aria-expanded={sub === s.slug}>
              <span className="th">{s.pic && <img src={s.pic} alt="" />}</span><span className="nm">{s.name}<small>{s.count} items</small></span><span className="chev">›</span>
            </button>
          ))}
        </nav>
        <div className="mfoot"><Link href="/delivery">Delivery</Link><Link href="/faq">FAQ</Link><Link href="/contact">Contact us</Link></div>
        {menu.filter((s) => !s.deal).map((s) => (
          <div key={s.slug} className={`msub ${sub === s.slug ? "on" : ""}`} aria-hidden={sub !== s.slug} inert={sub !== s.slug}>
            <button type="button" className="back" onClick={() => setSub(null)}>‹ Back</button>
            <h3>{s.name}</h3>
            <Link className="all" href={`/${s.slug}`}>Shop all {s.name} <span>{s.count}</span></Link>
            {s.subs.map((x) => (
              <Link key={x.slug} href={`/${s.slug}/${x.slug}`}><span className="th">{x.pic && <img src={x.pic} alt="" />}</span><span className="nm">{x.name}</span><span className="n">{x.count}</span></Link>
            ))}
            {s.brands.length > 0 && <>
              <h4>Top brands</h4>
              <div className="bchips">{s.brands.map(([b]) => <Link key={b} href={`/${s.slug}?brand=${encodeURIComponent(b)}`}>{b}</Link>)}</div>
            </>}
          </div>
        ))}
      </aside>
      <CartDrawer />
    </>
  );
}

"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { Menu } from "@/lib/catalogue";
import { useCart } from "./CartProvider";
import { CartDrawer } from "./CartDrawer";
import { IconBag, IconClose, IconMenu } from "./Icons";
import { SearchBox } from "./SearchBox";

export function Header({ menu }: { menu: Menu }) {
  const { count, setOpen, ready } = useCart();
  const [side, setSide] = useState(false);
  const [hoverOff, setHoverOff] = useState(false);
  const path = usePathname();
  const current = path.split("/")[1];
  // Close menus after navigating (and let the desktop dropdown close on click).
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setSide(false); setHoverOff(true); }, [path]);
  useEffect(() => {
    if (!side) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setSide(false);
    addEventListener("keydown", esc);
    return () => removeEventListener("keydown", esc);
  }, [side]);

  const cats = menu.flatMap((s) => [{ name: s.name, href: `/${s.slug}` }, ...s.subs.map((x) => ({ name: `${x.name} · ${s.name}`, href: `/${s.slug}/${x.slug}` }))]);

  return (
    <>
      <div className="strip">Free delivery over $80<span className="sd"> · Same-day delivery across Singapore</span></div>
      <header className="hdr">
        <div className="wrap hbar">
          <button className="icon-btn menu-btn" aria-label="Menu" onClick={() => setSide(true)}><IconMenu /></button>
          <Link className="logo" href="/"><img src="/drinq-logo-black.png" alt="DRINQ" width={115} height={32} /></Link>
          <SearchBox cats={cats} />
          <button className="icon-btn cart-btn" aria-label={`Cart, ${count} items`} onClick={() => setOpen(true)}>
            <IconBag />{ready && <span className="badge">{count}</span>}
          </button>
        </div>
        <div className="wrap msearch"><SearchBox cats={cats} /></div>
        <nav className="cats wrap" aria-label="Categories" onMouseMove={() => hoverOff && setHoverOff(false)}>
          {menu.map((s) => (
            <div className="item" key={s.slug}>
              <Link className={`top ${s.deal ? "hot" : ""} ${current === s.slug ? "on" : ""}`} href={`/${s.slug}`}>
                {s.name}{s.deal && <span>({s.count})</span>}
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

      <div className={`scrim ${side ? "on" : ""}`} onClick={() => setSide(false)} />
      <aside className={`side ${side ? "on" : ""}`} aria-label="Menu" aria-hidden={!side} inert={!side}>
        <div className="top">
          <img src="/drinq-logo-black.png" alt="DRINQ" style={{ height: 24, width: "auto" }} />
          <button className="icon-btn" aria-label="Close menu" onClick={() => setSide(false)}><IconClose /></button>
        </div>
        {menu.map((s) => s.deal ? (
          <Link key={s.slug} className="plain" href={`/${s.slug}`} style={{ color: "var(--red)", fontWeight: 800, fontSize: 17 }}>Deals ({s.count})</Link>
        ) : (
          <details key={s.slug} open={current === s.slug}>
            <summary>{s.name}</summary>
            <Link href={`/${s.slug}`}>Shop all <span>{s.count}</span></Link>
            {s.subs.map((x) => <Link key={x.slug} href={`/${s.slug}/${x.slug}`}>{x.name} <span>{x.count}</span></Link>)}
          </details>
        ))}
        <Link className="plain" href="/delivery">Delivery</Link>
        <Link className="plain" href="/faq">FAQ</Link>
        <Link className="plain" href="/contact">Contact us</Link>
      </aside>
      <CartDrawer />
    </>
  );
}

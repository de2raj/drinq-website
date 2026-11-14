"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { money } from "@/lib/money";
import type { ProductLite } from "@/lib/types";
import { useCart } from "./CartProvider";

export type HeroSlide = { pill: string; title: string; highlight: string; text: string; theme: string; image: string; product: ProductLite };

/** Homepage rotating banner: one product per slide, changes every 5 seconds (pauses on hover / touch). */
export function HeroSlider({ slides }: { slides: HeroSlide[] }) {
  const { add } = useCart();
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const touch = useRef<number | null>(null);
  const n = slides.length;
  const go = useCallback((k: number) => setI(((k % n) + n) % n), [n]);

  useEffect(() => {
    if (n < 2 || paused || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setTimeout(() => go(i + 1), 5000);
    return () => clearTimeout(t);
  }, [i, n, paused, go]);

  if (!n) return null;
  return (
    <div className="slider" aria-roledescription="carousel" aria-label="Featured drinks"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => { touch.current = e.touches[0].clientX; setPaused(true); }}
      onTouchEnd={(e) => {
        const s = touch.current; touch.current = null;
        if (s !== null) { const dx = e.changedTouches[0].clientX - s; if (Math.abs(dx) > 40) go(i + (dx < 0 ? 1 : -1)); }
      }}>
      {slides.map((s, k) => {
        const p = s.product;
        const off = p.was > p.price;
        return (
          <div key={k} className={`slide t-${s.theme} ${k === i ? "on" : ""}`} aria-hidden={k !== i} inert={k !== i}
            role="group" aria-roledescription="slide" aria-label={`${k + 1} of ${n}`}>
            <div className="stext">
              {s.pill && <span className="spill2">{s.pill}</span>}
              <h2 className="display">{s.title}{s.highlight && <><br /><em>{s.highlight}</em></>}</h2>
              {s.text && <p>{s.text}</p>}
              <div className="sprice">{money(p.price)}{off && <s>{money(p.was)}</s>}{p.size && <small>{p.size}</small>}</div>
              <div className="sbtns">
                {p.inStock
                  ? <button className="btn btn-sm" onClick={() => add(p)}>Add to cart</button>
                  : <span className="btn btn-sm btn-white" aria-disabled="true">Sold out</span>}
                <Link className="u" href={`/p/${p.slug}`}>Details</Link>
              </div>
            </div>
            <Link href={`/p/${p.slug}`} className="simg" tabIndex={-1} aria-hidden="true">
              <img src={s.image || p.thumb} alt="" loading={k === 0 ? "eager" : "lazy"} />
            </Link>
          </div>
        );
      })}
      {n > 1 && (
        <div className="sctl">
          <div className="sdots">
            {slides.map((s, k) => <button key={k} className={k === i ? "on" : ""} onClick={() => go(k)} aria-label={`Show ${s.title}`} />)}
          </div>
          <div className="sarrows">
            <button onClick={() => go(i - 1)} aria-label="Previous">‹</button>
            <button onClick={() => go(i + 1)} aria-label="Next">›</button>
          </div>
        </div>
      )}
    </div>
  );
}

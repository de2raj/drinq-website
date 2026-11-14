"use client";
import Link from "next/link";
import { useEffect } from "react";
import { money } from "@/lib/money";
import { decode } from "@/lib/text";
import { useCart } from "./CartProvider";
import { IconClose } from "./Icons";

/** "Add $X more for FREE next-day delivery" (same rules as the Botello app). */
export function FreeDeliveryBar({ subtotal }: { subtotal: number }) {
  const { tiers } = useCart();
  if (!tiers.length) return null;
  const goal = tiers.find((t) => subtotal < t.threshold);
  const unlocked = tiers.filter((t) => subtotal >= t.threshold).pop();
  const from = unlocked?.threshold ?? 0;
  const pct = goal ? Math.min(100, Math.max(0, ((subtotal - from) / (goal.threshold - from)) * 100)) : 100;
  return (
    <>
      {!goal ? <b>FREE {tiers.length === 1 ? tiers[0].label : "delivery"} unlocked 🎉</b>
        : unlocked ? <><b>FREE {unlocked.label}</b> unlocked · add <b>{money(goal.threshold - subtotal)}</b> for FREE {goal.label}</>
        : <>Add <b>{money(goal.threshold - subtotal)}</b> more for FREE {goal.label}</>}
      <div className="pbar"><i style={{ width: `${pct}%` }} /></div>
    </>
  );
}

export function CartLines({ compact }: { compact?: boolean }) {
  const { lines, setQty } = useCart();
  return lines.map((l) => (
    <div className="line" key={l.id}>
      <Link className="th" href={`/p/${l.slug}`}>{l.thumb && <img src={l.thumb} alt="" />}</Link>
      <div className="nm">
        <Link href={`/p/${l.slug}`}>{decode(l.name)}</Link>
        <b>{money(l.price * l.qty)}</b>
        {!compact && <small>{money(l.price)} each</small>}
        <button className="rm" onClick={() => setQty(l.id, 0)}>Remove</button>
      </div>
      <div className="qty">
        <button onClick={() => setQty(l.id, l.qty - 1)} aria-label="One less">−</button>
        <span>{l.qty}</span>
        <button onClick={() => setQty(l.id, l.qty + 1)} aria-label="One more">+</button>
      </div>
    </div>
  ));
}

export function CartDrawer() {
  const { lines, open, setOpen, subtotal } = useCart();
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    addEventListener("keydown", esc);
    return () => removeEventListener("keydown", esc);
  }, [open, setOpen]);
  return (
    <>
      <div className={`scrim ${open ? "on" : ""}`} onClick={() => setOpen(false)} />
      <aside className={`drawer ${open ? "on" : ""}`} aria-label="Cart" aria-hidden={!open} inert={!open}>
        <div className="top"><h3>Your cart</h3><button className="icon-btn" aria-label="Close cart" onClick={() => setOpen(false)}><IconClose /></button></div>
        <div className="lines">
          {lines.length ? <CartLines compact /> : (
            <div className="empty">Your cart is empty.<br /><br /><button className="btn" onClick={() => setOpen(false)}>Start shopping</button></div>
          )}
        </div>
        {lines.length > 0 && (
          <>
            <div className="progress"><FreeDeliveryBar subtotal={subtotal} /></div>
            <div className="checkout">
              <div className="tot"><span>Subtotal</span><span>{money(subtotal)}</span></div>
              <Link className="btn btn-block" href="/checkout" onClick={() => setOpen(false)}>Checkout →</Link>
              <Link className="u" href="/cart" onClick={() => setOpen(false)} style={{ display: "block", textAlign: "center", marginTop: 10, fontWeight: 700, fontSize: 14 }}>View full cart</Link>
              <small>PayNow · Cards · Apple Pay · Google Pay</small>
            </div>
          </>
        )}
      </aside>
    </>
  );
}

"use client";
import { useState } from "react";
import type { ProductLite } from "@/lib/types";
import { useCart } from "./CartProvider";

export function BuyBox({ p, earnRate = 0 }: { p: ProductLite; earnRate?: number }) {
  const { add, setOpen, lines } = useCart();
  const [qty, setQty] = useState(1);
  const inCart = lines.find((l) => l.id === p.id)?.qty ?? 0;
  const earn = Math.floor((p.price * qty / 100) * earnRate);
  if (!p.inStock) return <div className="buy"><button className="btn btn-white" disabled>Sold out</button></div>;
  return (
    <>
      {earn > 0 && <p className="pearn"><span className="coin" aria-hidden="true">DQ</span><b>{earn} DRINQ points</b>{qty > 1 ? ` for ${qty} bottles` : " with this bottle"}</p>}
      <div className="buy">
        <div className="qty big">
          <button onClick={() => setQty(Math.max(1, qty - 1))} aria-label="One less">−</button>
          <span>{qty}</span>
          <button onClick={() => setQty(Math.min(99, qty + 1))} aria-label="One more">+</button>
        </div>
        <button className="btn" onClick={() => { add(p, qty); setQty(1); setOpen(true); }}>Add to cart</button>
      </div>
      {inCart > 0 && (
        <div className="incart">
          <span className="ok" aria-hidden="true">✓</span>
          <span><b>{inCart} in your cart</b><small>{inCart === 1 ? "This bottle is" : "These bottles are"} saved in your cart</small></span>
          <button type="button" onClick={() => setOpen(true)}>View cart →</button>
        </div>
      )}
    </>
  );
}

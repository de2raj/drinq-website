"use client";
import { useState } from "react";
import type { ProductLite } from "@/lib/types";
import { useCart } from "./CartProvider";

export function BuyBox({ p }: { p: ProductLite }) {
  const { add, setOpen, lines } = useCart();
  const [qty, setQty] = useState(1);
  const inCart = lines.find((l) => l.id === p.id)?.qty ?? 0;
  if (!p.inStock) return <div className="buy"><button className="btn btn-white" disabled>Sold out</button></div>;
  return (
    <>
      <div className="buy">
        <div className="qty big">
          <button onClick={() => setQty(Math.max(1, qty - 1))} aria-label="One less">−</button>
          <span>{qty}</span>
          <button onClick={() => setQty(Math.min(99, qty + 1))} aria-label="One more">+</button>
        </div>
        <button className="btn" onClick={() => { add(p, qty); setQty(1); setOpen(true); }}>Add to cart</button>
      </div>
      {inCart > 0 && <p style={{ fontWeight: 700, marginTop: -8 }}>✓ {inCart} in your cart</p>}
    </>
  );
}

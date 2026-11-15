"use client";
import { useCart } from "./CartProvider";
import type { ProductLite } from "@/lib/types";

/** "+ Add", then a − 2 + stepper once it's in the cart (− at 1 removes it). */
export function AddButton({ p }: { p: ProductLite }) {
  const { lines, add, setQty } = useCart();
  const inCart = lines.find((l) => l.id === p.id)?.qty ?? 0;
  if (!p.inStock) return <button className="add" disabled>Sold out</button>;
  if (inCart) {
    return (
      <div className="cstep" role="group" aria-label={`${p.name} in cart`}>
        <button type="button" onClick={() => setQty(p.id, inCart - 1)} aria-label={inCart === 1 ? `Remove ${p.name}` : `One less ${p.name}`}>−</button>
        <span aria-live="polite">{inCart}</span>
        <button type="button" onClick={() => add(p)} disabled={inCart >= 99} aria-label={`One more ${p.name}`}>+</button>
      </div>
    );
  }
  return (
    <button className="add" onClick={() => add(p)} aria-label={`Add ${p.name} to cart`}>
      +<span className="t"> Add</span>
    </button>
  );
}

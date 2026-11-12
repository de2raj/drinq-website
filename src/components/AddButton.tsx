"use client";
import { useCart } from "./CartProvider";
import type { ProductLite } from "@/lib/types";

export function AddButton({ p }: { p: ProductLite }) {
  const { lines, add } = useCart();
  const inCart = lines.find((l) => l.id === p.id)?.qty ?? 0;
  if (!p.inStock) return <button className="add" disabled>Sold out</button>;
  return (
    <button className={`add ${inCart ? "on" : ""}`} onClick={() => add(p)} aria-label={`Add ${p.name} to cart`}>
      {inCart ? `✓ ${inCart}` : <>+<span className="t"> Add</span></>}
    </button>
  );
}

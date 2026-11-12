"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ProductLite } from "@/lib/types";

export type CartLine = Pick<ProductLite, "id" | "slug" | "name" | "brand" | "size" | "price" | "thumb"> & { qty: number };

type Ctx = {
  lines: CartLine[];
  ready: boolean;
  count: number;
  subtotal: number;
  add: (p: ProductLite, qty?: number) => void;
  setQty: (id: string, qty: number) => void;
  replace: (lines: CartLine[]) => void;
  clear: () => void;
  open: boolean;
  setOpen: (v: boolean) => void;
  toast: (msg: string) => void;
};

const CartCtx = createContext<Ctx | null>(null);
const KEY = "drinq-cart-v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || "[]");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restore the saved cart once, after hydration
      if (Array.isArray(saved)) setLines(saved);
    } catch {}
    setReady(true);
    const sync = (e: StorageEvent) => {
      if (e.key === KEY) try { setLines(JSON.parse(e.newValue || "[]")); } catch {}
    };
    addEventListener("storage", sync);
    return () => removeEventListener("storage", sync);
  }, []);

  useEffect(() => {
    if (ready) try { localStorage.setItem(KEY, JSON.stringify(lines)); } catch {}
  }, [lines, ready]);

  const toast = useCallback((m: string) => {
    setMsg(m);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(""), 1500);
  }, []);

  const add = useCallback((p: ProductLite, qty = 1) => {
    setLines((ls) => {
      const i = ls.findIndex((l) => l.id === p.id);
      if (i >= 0) return ls.map((l, j) => (j === i ? { ...l, qty: Math.min(99, l.qty + qty) } : l));
      return [...ls, { id: p.id, slug: p.slug, name: p.name, brand: p.brand, size: p.size, price: p.price, thumb: p.thumb, qty }];
    });
    toast("Added to cart");
  }, [toast]);

  const setQty = useCallback((id: string, qty: number) => {
    setLines((ls) => (qty <= 0 ? ls.filter((l) => l.id !== id) : ls.map((l) => (l.id === id ? { ...l, qty: Math.min(99, qty) } : l))));
  }, []);

  const value = useMemo<Ctx>(() => ({
    lines, ready, open, setOpen, add, setQty, toast,
    replace: setLines,
    clear: () => setLines([]),
    count: lines.reduce((a, l) => a + l.qty, 0),
    subtotal: lines.reduce((a, l) => a + l.qty * l.price, 0),
  }), [lines, ready, open, add, setQty, toast]);

  return (
    <CartCtx.Provider value={value}>
      {children}
      <div className={`toast ${msg ? "on" : ""}`} role="status" aria-live="polite">{msg}</div>
    </CartCtx.Provider>
  );
}

export function useCart() {
  const c = useContext(CartCtx);
  if (!c) throw new Error("useCart outside CartProvider");
  return c;
}

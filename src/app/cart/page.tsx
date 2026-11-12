"use client";
import Link from "next/link";
import { CartLines, FreeDeliveryBar } from "@/components/CartDrawer";
import { useCart } from "@/components/CartProvider";
import { SHOP } from "@/lib/config";
import { money } from "@/lib/money";

export default function CartPage() {
  const { lines, subtotal, ready } = useCart();
  const fee = subtotal >= SHOP.freeDeliveryFrom ? 0 : SHOP.deliveryFee;
  return (
    <div className="wrap">
      <div className="crumbs"><Link href="/">Home</Link> / Cart</div>
      <div className="chero"><h1 className="display">Your cart</h1></div>
      {!ready ? null : !lines.length ? (
        <div className="panel" style={{ textAlign: "center" }}>
          <p style={{ fontWeight: 600, marginBottom: 18 }}>Your cart is empty.</p>
          <Link className="btn" href="/whisky">Start shopping</Link>
        </div>
      ) : (
        <div className="co">
          <div className="panel" style={{ paddingTop: 8 }}><CartLines /></div>
          <div className="summary">
            <div className="panel">
              <div className="row"><span>Subtotal</span><span>{money(subtotal)}</span></div>
              <div className="row"><span>Delivery</span><span>{fee ? money(fee) : "Free"}</span></div>
              <div className="row total"><span>Total</span><span>{money(subtotal + fee)}</span></div>
              <div style={{ margin: "14px 0", fontSize: 14, fontWeight: 600 }}><FreeDeliveryBar subtotal={subtotal} /></div>
              <Link className="btn btn-block" href="/checkout">Checkout →</Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

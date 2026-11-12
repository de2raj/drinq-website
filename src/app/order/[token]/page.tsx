import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { SHOP } from "@/lib/config";
import { db } from "@/lib/db";
import { slotLabel } from "@/lib/delivery";
import { money } from "@/lib/money";
import { markPaid } from "@/lib/orders";
import { paynowPayload } from "@/lib/paynow";
import { getCheckoutSession, stripeEnabled } from "@/lib/stripe";

export const metadata: Metadata = { title: "Your order", robots: { index: false } };
export const dynamic = "force-dynamic";

type P = { params: Promise<{ token: string }>; searchParams: Promise<{ session_id?: string; cancelled?: string }> };

export default async function OrderPage({ params, searchParams }: P) {
  const { token } = await params;
  const sp = await searchParams;
  if (!/^[a-f0-9]{32}$/.test(token)) notFound();
  let order = await db.order.findUnique({ where: { token }, include: { lines: true } });
  if (!order) notFound();

  // Back from Stripe: confirm the payment with Stripe directly (the webhook does the same in the background).
  if (order.status === "AWAITING_PAYMENT" && order.stripeSessionId && sp.session_id === order.stripeSessionId && stripeEnabled()) {
    try {
      const s = await getCheckoutSession(order.stripeSessionId);
      if (s.payment_status === "paid") {
        await markPaid(order.number, s.id);
        order = (await db.order.findUnique({ where: { token }, include: { lines: true } }))!;
      }
    } catch (e) { console.error("Stripe check failed", e); }
  }

  const paid = order.status === "PAID";
  const qr = !paid && order.status === "AWAITING_PAYMENT"
    ? await QRCode.toDataURL(
        paynowPayload({ uen: process.env.PAYNOW_UEN || SHOP.uen, name: process.env.PAYNOW_NAME || SHOP.company, amountCents: order.total, reference: order.number }),
        { margin: 1, width: 480, color: { dark: "#231F20", light: "#FFFFFF" } })
    : null;

  return (
    <div className="wrap" style={{ maxWidth: 900 }}>
      <div className="done">
        <div className="tick">{paid ? "✓" : "!"}</div>
        <h1 className="display">{paid ? "Thank you!" : "Order received"}</h1>
        <p>Order <b>{order.number}</b> · {paid ? "Paid — we’re getting it ready." : "Waiting for payment."}</p>
        <p style={{ fontSize: 14 }}>Bookmark this page to check your order any time.</p>
      </div>

      {sp.cancelled && !paid && <div className="notice">Card payment was cancelled. Your order is saved — you can pay by PayNow below.</div>}

      {qr && (
        <div className="panel">
          <h2>Pay {money(order.total)} by PayNow</h2>
          <div className="qrbox">
            <img className="qr" src={qr} alt={`PayNow QR for ${money(order.total)}`} />
            <div>
              <ol>
                <li>Open your banking app and choose <b>Scan &amp; Pay</b> / PayNow.</li>
                <li>Scan the QR. It fills in <b>{money(order.total)}</b> to <b>{SHOP.company}</b>.</li>
                <li>Check the reference is <b>{order.number}</b>, then pay.</li>
              </ol>
              <p style={{ marginTop: 12, fontWeight: 600, fontSize: 14 }}>On a phone? Take a screenshot and upload it in your banking app’s PayNow scanner. Or pay to UEN <b>{process.env.PAYNOW_UEN || SHOP.uen}</b> with reference <b>{order.number}</b>.</p>
              <p style={{ marginTop: 8, fontWeight: 600, fontSize: 14 }}>We confirm your order as soon as the payment arrives.</p>
            </div>
          </div>
        </div>
      )}

      <div className="panel">
        <h2>Delivery</h2>
        <dl className="kv">
          <dt>When</dt><dd>{slotLabel(order.deliveryDate, order.deliverySlot)}</dd>
          <dt>To</dt><dd>{order.name}, {order.address}{order.unit ? `, ${order.unit}` : ""}, Singapore {order.postal}</dd>
          <dt>Phone</dt><dd>{order.phone}</dd>
          {order.notes && <><dt>Notes</dt><dd>{order.notes}</dd></>}
          <dt>Status</dt><dd><span className={`status ${paid ? "paid" : "wait"}`}>{paid ? "Paid" : order.status === "CANCELLED" ? "Cancelled" : "Awaiting payment"}</span></dd>
        </dl>
        <p style={{ fontSize: 14, fontWeight: 600, marginTop: 14 }}>Please have your ID ready — we can only hand over to someone aged 18 or over.</p>
      </div>

      <div className="panel">
        <h2>Items</h2>
        {order.lines.map((l) => (
          <div className="summary" key={l.id} style={{ position: "static" }}>
            <div className="row"><span>{l.qty} × {l.name}</span><span>{money(l.lineTotal)}</span></div>
          </div>
        ))}
        <div className="summary" style={{ position: "static" }}>
          <div className="row"><span>Delivery</span><span>{order.deliveryFee ? money(order.deliveryFee) : "Free"}</span></div>
          <div className="row total"><span>Total</span><span>{money(order.total)}</span></div>
        </div>
      </div>
      <p style={{ textAlign: "center", fontWeight: 600 }}>Questions? <a className="u" href={SHOP.telegramUrl} target="_blank" rel="noopener">Message us on Telegram</a> with your order number. <Link className="u" href="/">Back to the shop</Link></p>
    </div>
  );
}

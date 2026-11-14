import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { PayIcon } from "@/components/PayIcon";
import { Timeline } from "@/components/Timeline";
import { SHOP } from "@/lib/config";
import { db } from "@/lib/db";
import { dayLabel } from "@/lib/delivery";
import { money } from "@/lib/money";
import { isCollection, statusLabel, timeline } from "@/lib/order-status";
import { markPaid } from "@/lib/orders";
import { paynowPayload } from "@/lib/paynow";
import { getSetting } from "@/lib/settings";
import { getCheckoutSession, stripeEnabled } from "@/lib/stripe";
import { simulatePayment } from "./actions";

export const metadata: Metadata = { title: "Your order", robots: { index: false } };
export const dynamic = "force-dynamic";

type P = { params: Promise<{ token: string }>; searchParams: Promise<{ session_id?: string; cancelled?: string }> };

export default async function OrderPage({ params, searchParams }: P) {
  const { token } = await params;
  const sp = await searchParams;
  if (!/^[a-f0-9]{32}$/.test(token)) notFound();
  const load = () => db.order.findUnique({ where: { token }, include: { lines: true, events: { orderBy: { at: "asc" } } } });
  let order = await load();
  if (!order) notFound();

  if (order.status === "AWAITING_PAYMENT" && order.stripeSessionId && sp.session_id === order.stripeSessionId && stripeEnabled()) {
    try {
      const s = await getCheckoutSession(order.stripeSessionId);
      if (s.payment_status === "paid") { await markPaid(order.number, s.id); order = (await load())!; }
    } catch (e) { console.error("Stripe check failed", e); }
  }

  const [payments, methods] = await Promise.all([getSetting("payments"), getSetting("delivery")]);
  const pay = payments.options.find((p) => p.id === order.paymentMethod) ?? payments.options[0];
  const waiting = order.status === "AWAITING_PAYMENT";
  const test = payments.testMode || order.isTest;
  const collect = isCollection(order.deliveryMethod);
  const method = methods.find((m) => m.id === order.deliveryMethod);

  // In test mode the QR only carries a note, so no banking app can pay it.
  const qr = waiting && order.paymentMethod === "PAYNOW"
    ? await QRCode.toDataURL(
        test
          ? `DRINQ TEST ORDER ${order.number} - NOT PAYABLE`
          : paynowPayload({ uen: process.env.PAYNOW_UEN || SHOP.uen, name: process.env.PAYNOW_NAME || SHOP.company, amountCents: order.total, reference: order.number }),
        { margin: 1, width: 480, color: { dark: "#231F20", light: "#FFFFFF" } })
    : null;

  const steps = timeline(order);
  const done = ["DELIVERED", "COLLECTED"].includes(order.status);

  return (
    <div className="wrap" style={{ maxWidth: 920 }}>
      <div className="done">
        <div className="tick">{waiting ? "!" : order.status === "CANCELLED" ? "×" : "✓"}</div>
        <h1 className="display">{waiting ? "Order received" : order.status === "CANCELLED" ? "Order cancelled" : done ? "Enjoy!" : "Thank you!"}</h1>
        <p>Order <b>{order.number}</b> · {statusLabel(order.status)}</p>
      </div>

      {sp.cancelled && waiting && <div className="notice">Card payment was cancelled. Your order is saved — choose how to pay below.</div>}

      {waiting && (
        <div className="panel">
          <h2><PayIcon id={pay.id} /> Pay {money(order.total)} by {pay.name}</h2>
          {qr ? (
            <div className="qrbox">
              <div className="qrwrap">
                <img className="qr" src={qr} alt={`PayNow QR for ${money(order.total)}`} />
                {test && <span className="qrtest">TEST QR · NOT PAYABLE</span>}
              </div>
              <div>
                <ol>
                  <li>Open your banking app and choose <b>Scan &amp; Pay</b> / PayNow.</li>
                  <li>Scan the QR. It fills in <b>{money(order.total)}</b> to <b>{SHOP.company}</b>.</li>
                  <li>Check the reference is <b>{order.number}</b>, then pay.</li>
                </ol>
              </div>
            </div>
          ) : (
            <div className="payph">
              <p><b>{pay.name}</b> payments are being set up.</p>
              <button className="btn btn-line" disabled>Pay {money(order.total)} with {pay.name}</button>
            </div>
          )}
          {test && (
            <form action={simulatePayment} className="simulate">
              <input type="hidden" name="token" value={token} />
              <p><b>Test mode:</b> no real payment is taken. Simulate a successful payment to continue the order.</p>
              <button className="btn">Simulate payment</button>
            </form>
          )}
        </div>
      )}

      <div className="panel">
        <h2>Order status</h2>
        <Timeline steps={steps} />
      </div>

      <div className="panel">
        <h2>{collect ? "Self-collection" : "Delivery"}</h2>
        <dl className="kv">
          <dt>Option</dt><dd>{order.deliveryLabel || method?.name || "Delivery"}</dd>
          {order.deliveryDate && <><dt>{collect ? "Collect on" : "Date"}</dt><dd>{dayLabel(order.deliveryDate)}</dd></>}
          {order.deliverySlot && <><dt>Time</dt><dd>{order.deliverySlot}</dd></>}
          {collect
            ? <><dt>Address</dt><dd>{method?.address}</dd></>
            : <><dt>To</dt><dd>{order.name}, {order.address}{order.unit ? `, ${order.unit}` : ""}, Singapore {order.postal}</dd></>}
          <dt>Phone</dt><dd>{order.phone}</dd>
          {order.notes && <><dt>Notes</dt><dd>{order.notes}</dd></>}
        </dl>
        <p style={{ fontSize: 14, fontWeight: 600, marginTop: 14 }}>Please have your ID ready — we can only hand over to someone aged 18 or over.</p>
      </div>

      <div className="panel">
        <h2>Items</h2>
        <div className="summary" style={{ position: "static" }}>
          {order.lines.map((l) => <div className="row" key={l.id}><span>{l.qty} × {l.name}</span><span>{money(l.lineTotal)}</span></div>)}
          <div className="row"><span>{order.deliveryLabel || "Delivery"}</span><span>{order.deliveryFee ? money(order.deliveryFee) : "Free"}</span></div>
          <div className="row total"><span>Total</span><span>{money(order.total)}</span></div>
        </div>
      </div>
      <p style={{ textAlign: "center", fontWeight: 600 }}>Questions? <a className="u" href={SHOP.telegramUrl} target="_blank" rel="noopener">Message us on Telegram</a> with your order number. <Link className="u" href="/">Back to the shop</Link></p>
    </div>
  );
}

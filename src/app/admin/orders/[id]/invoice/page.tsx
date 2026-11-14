import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/AdminButtons";
import { SHOP } from "@/lib/config";
import { db } from "@/lib/db";
import { dayLabel } from "@/lib/delivery";
import { money } from "@/lib/money";
import { decode } from "@/lib/text";
import { isCollection, PAID_STATUSES } from "@/lib/order-status";
import { getSetting } from "@/lib/settings";

export const metadata: Metadata = { title: "Invoice · Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Invoice({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const o = Number.isInteger(id) ? await db.order.findUnique({ where: { id }, include: { lines: true } }) : null;
  if (!o) notFound();
  const [payments, methods] = await Promise.all([getSetting("payments"), getSetting("delivery")]);
  const pay = payments.options.find((p) => p.id === o.paymentMethod)?.name ?? o.paymentMethod;
  const shopAddress = methods.find((m) => m.id === "COLLECT")?.address ?? "";
  const paid = PAID_STATUSES.includes(o.status as never);
  const collect = isCollection(o.deliveryMethod);
  const d = (x: Date) => x.toLocaleDateString("en-SG", { timeZone: "Asia/Singapore", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="wrap">
      <div className="invbar noprint">
        <Link className="u" href={`/admin/orders/${o.id}`}>← Back to order</Link>
        <PrintButton />
      </div>
      <article className="invoice">
        <header className="ihead">
          <div>
            <img src="/drinq-logo-black.png" alt="DRINQ" className="ilogo" />
            <p><b>{SHOP.company}</b><br />UEN {SHOP.uen}<br />{shopAddress}<br />drinq.sg</p>
          </div>
          <div className="iright">
            <h1>Invoice</h1>
            <dl>
              <dt>Invoice no.</dt><dd>{o.number}</dd>
              <dt>Date</dt><dd>{d(o.createdAt)}</dd>
              <dt>Status</dt><dd><span className={`istamp ${paid ? "ok" : o.status === "CANCELLED" ? "x" : ""}`}>{o.status === "CANCELLED" ? "Cancelled" : paid ? "Paid" : "Unpaid"}</span></dd>
            </dl>
          </div>
        </header>
        <section className="iparties">
          <div><h3>Bill to</h3><p>{o.name}<br />{o.phone}{o.email && <><br />{o.email}</>}</p></div>
          <div><h3>{collect ? "Collection" : "Deliver to"}</h3>
            <p>{collect ? shopAddress : <>{o.address}{o.unit ? `, ${o.unit}` : ""}<br />Singapore {o.postal}</>}
              <br />{o.deliveryLabel}{o.deliveryDate && <> · {dayLabel(o.deliveryDate)}</>}{o.deliverySlot && <>, {o.deliverySlot}</>}</p></div>
        </section>
        <table className="itable">
          <thead><tr><th>Item</th><th>Qty</th><th>Unit price</th><th>Amount</th></tr></thead>
          <tbody>
            {o.lines.map((l) => <tr key={l.id}><td>{decode(l.name)}{l.sku && <small> · {l.sku}</small>}</td><td>{l.qty}</td><td>{money(l.unitPrice)}</td><td>{money(l.lineTotal)}</td></tr>)}
          </tbody>
          <tfoot>
            <tr><td colSpan={3}>Subtotal</td><td>{money(o.subtotal)}</td></tr>
            <tr><td colSpan={3}>{o.deliveryLabel || "Delivery"}</td><td>{o.deliveryFee ? money(o.deliveryFee) : "Free"}</td></tr>
            {o.pointsDiscount > 0 && <tr><td colSpan={3}>Loyalty points ({o.pointsUsed})</td><td>−{money(o.pointsDiscount)}</td></tr>}
            <tr className="itotal"><td colSpan={3}>Total (SGD)</td><td>{money(o.total)}</td></tr>
          </tfoot>
        </table>
        <p className="ifoot">Payment: {pay}{o.paidAt ? ` · received ${d(o.paidAt)}` : ""}<br />
          Alcohol is sold only to persons aged 18 and above. Thank you for ordering with DRINQ.</p>
      </article>
    </div>
  );
}

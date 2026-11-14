import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminNav } from "@/components/AdminNav";
import { Timeline } from "@/components/Timeline";
import { db } from "@/lib/db";
import { dayLabel } from "@/lib/delivery";
import { money } from "@/lib/money";
import { isCollection, nextStatus, statusLabel, timeline } from "@/lib/order-status";
import { getSetting } from "@/lib/settings";
import { changeStatus, saveNote } from "../actions";

export const metadata: Metadata = { title: "Order · Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function OrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const o = Number.isInteger(id) ? await db.order.findUnique({ where: { id }, include: { lines: true, events: { orderBy: { at: "asc" } } } }) : null;
  if (!o) notFound();
  const [payments, methods] = await Promise.all([getSetting("payments"), getSetting("delivery")]);
  const next = nextStatus(o.status, o.deliveryMethod);
  const collect = isCollection(o.deliveryMethod);
  const pay = payments.options.find((p) => p.id === o.paymentMethod)?.name ?? o.paymentMethod;
  const [prev, after] = await Promise.all([
    db.order.findFirst({ where: { id: { gt: o.id } }, orderBy: { id: "asc" }, select: { id: true } }),
    db.order.findFirst({ where: { id: { lt: o.id } }, orderBy: { id: "desc" }, select: { id: true } }),
  ]);
  const t = (d: Date) => d.toLocaleString("en-SG", { timeZone: "Asia/Singapore", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

  return (
    <div className="wrap admin">
      <AdminNav active="orders" />
      <div className="ohead">
        <div>
          <Link className="u" href="/admin/orders">← All orders</Link>
          <h2 className="display atitle">{o.number} {o.isTest && <i className="ttag">TEST</i>}</h2>
          <span className={`spill s-${o.status}`}>{statusLabel(o.status)}</span> <small>Placed {t(o.createdAt)}</small>
        </div>
        <div className="onav">
          {prev && <Link className="btn btn-sm btn-line" href={`/admin/orders/${prev.id}`}>← Newer</Link>}
          {after && <Link className="btn btn-sm btn-line" href={`/admin/orders/${after.id}`}>Older →</Link>}
          <a className="btn btn-sm btn-line" href={`/order/${o.token}`} target="_blank" rel="noopener">Customer page ↗</a>
        </div>
      </div>

      <div className="pgrid">
        <div>
          <section className="panel">
            <h2>Items</h2>
            <div className="summary" style={{ position: "static" }}>
              {o.lines.map((l) => <div className="row" key={l.id}><span>{l.qty} × {l.name}{l.sku && <small> · #{l.sku}</small>}</span><span>{money(l.lineTotal)}</span></div>)}
              <div className="row"><span>{o.deliveryLabel || "Delivery"}</span><span>{o.deliveryFee ? money(o.deliveryFee) : "Free"}</span></div>
              <div className="row total"><span>Total</span><span>{money(o.total)}</span></div>
            </div>
          </section>
          <section className="panel">
            <h2>Customer &amp; {collect ? "collection" : "delivery"}</h2>
            <dl className="kv">
              <dt>Name</dt><dd>{o.name}</dd>
              <dt>Phone</dt><dd><a className="u" href={`tel:${o.phone}`}>{o.phone}</a></dd>
              <dt>Email</dt><dd><a className="u" href={`mailto:${o.email}`}>{o.email}</a></dd>
              <dt>Option</dt><dd>{o.deliveryLabel}</dd>
              {o.deliveryDate && <><dt>Date</dt><dd>{dayLabel(o.deliveryDate)}</dd></>}
              {o.deliverySlot && <><dt>Time</dt><dd>{o.deliverySlot}</dd></>}
              {collect
                ? <><dt>Collect at</dt><dd>{methods.find((m) => m.id === "COLLECT")?.address}</dd></>
                : <><dt>Address</dt><dd>{o.address}{o.unit ? `, ${o.unit}` : ""}, Singapore {o.postal}</dd></>}
              {o.notes && <><dt>Notes</dt><dd>{o.notes}</dd></>}
              <dt>Payment</dt><dd>{pay}{o.paidAt ? ` · paid ${t(o.paidAt)}` : ""}</dd>
            </dl>
          </section>
        </div>
        <div>
          <section className="panel">
            <h2>Status</h2>
            <Timeline steps={timeline(o)} />
            {next && (
              <form action={changeStatus} className="sform">
                <input type="hidden" name="id" value={o.id} /><input type="hidden" name="status" value={next} />
                <input name="note" aria-label="Note for this step (optional)" placeholder="Note (optional)" />
                <button className="btn btn-block">Mark as {statusLabel(next).toLowerCase()}</button>
              </form>
            )}
            {o.status !== "CANCELLED" && !["DELIVERED", "COLLECTED"].includes(o.status) && (
              <form action={changeStatus} style={{ marginTop: 10 }}>
                <input type="hidden" name="id" value={o.id} /><input type="hidden" name="status" value="CANCELLED" />
                <button className="btn btn-block btn-line">Cancel order</button>
              </form>
            )}
            {o.events.some((e) => e.note) && (
              <ul className="enotes">{o.events.filter((e) => e.note).map((e) => <li key={e.id}><b>{statusLabel(e.status)}</b> · {e.note} <small>{t(e.at)}</small></li>)}</ul>
            )}
          </section>
          <section className="panel">
            <h2>Staff note</h2>
            <form action={saveNote} className="sform">
              <input type="hidden" name="id" value={o.id} />
              <textarea name="adminNote" defaultValue={o.adminNote ?? ""} rows={4} aria-label="Staff note" />
              <button className="btn btn-sm">Save note</button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { AdminNav } from "@/components/AdminNav";
import { everyProduct } from "@/lib/catalogue";
import { db } from "@/lib/db";
import { todaySG } from "@/lib/delivery";
import { money } from "@/lib/money";
import { PAID_STATUSES, statusLabel } from "@/lib/order-status";

export const metadata: Metadata = { title: "Dashboard · Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

const SG = 8 * 3600_000;
/** Start of today in Singapore, as a real time. */
const sgMidnight = (daysAgo = 0) => new Date(Date.parse(todaySG() + "T00:00:00Z") - SG - daysAgo * 86400_000);

export default async function Dashboard() {
  const today = sgMidnight();
  const weekAgo = sgMidnight(6);
  const [orders, products, recent, byStatus] = await Promise.all([
    db.order.findMany({ where: { createdAt: { gte: weekAgo } }, select: { total: true, status: true, createdAt: true, isTest: true } }),
    everyProduct(),
    db.order.findMany({ orderBy: { id: "desc" }, take: 8 }),
    db.order.groupBy({ by: ["status"], _count: true }),
  ]);
  const count = (s: string) => byStatus.find((b) => b.status === s)?._count ?? 0;
  const paid = (o: { status: string }) => PAID_STATUSES.includes(o.status as never);
  const todays = orders.filter((o) => o.createdAt >= today);
  const salesToday = todays.filter(paid).reduce((a, o) => a + o.total, 0);
  const salesWeek = orders.filter(paid).reduce((a, o) => a + o.total, 0);

  // Best sellers, last 30 days (paid orders).
  const top = await db.orderLine.groupBy({
    by: ["name"], _sum: { qty: true, lineTotal: true },
    where: { order: { createdAt: { gte: sgMidnight(29) }, status: { in: PAID_STATUSES } } },
    orderBy: { _sum: { qty: "desc" } }, take: 5,
  });

  const tiles: [string, string | number, string, string][] = [
    ["Sales today", money(salesToday), `${todays.length} ${todays.length === 1 ? "order" : "orders"} today`, "/admin/orders"],
    ["Sales, last 7 days", money(salesWeek), `${orders.length} ${orders.length === 1 ? "order" : "orders"}`, "/admin/orders"],
    ["Awaiting payment", count("AWAITING_PAYMENT"), "not paid yet", "/admin/orders?s=AWAITING_PAYMENT"],
    ["To prepare", count("PAID") + count("PREPARING"), "paid, not sent", "/admin/orders?s=todo"],
    ["Out / ready", count("OUT_FOR_DELIVERY") + count("READY_FOR_COLLECTION"), "on the way or to collect", "/admin/orders?s=out"],
    ["Sold out", products.filter((p) => p.active && !p.inStock).length, `of ${products.filter((p) => p.active).length} products`, "/admin/products?f=out"],
  ];

  return (
    <div className="wrap admin">
      <AdminNav active="dashboard" />
      <div className="tiles4">
        {tiles.map(([label, value, sub, href]) => (
          <Link key={label} href={href} className="kpi"><span>{label}</span><b>{value}</b><small>{sub}</small></Link>
        ))}
      </div>

      <div className="dash2">
        <section className="panel">
          <div className="phead"><h2>Latest orders</h2><Link className="u" href="/admin/orders">All orders</Link></div>
          {recent.length ? (
            <div className="olist">
              {recent.map((o) => (
                <Link key={o.id} href={`/admin/orders/${o.id}`} className="orow">
                  <span><b>{o.number}</b>{o.isTest && <i className="ttag">TEST</i>}<small>{o.name} · {o.deliveryLabel || "Delivery"}</small></span>
                  <span className={`spill s-${o.status}`}>{statusLabel(o.status)}</span>
                  <b>{money(o.total)}</b>
                </Link>
              ))}
            </div>
          ) : <p>No orders yet.</p>}
        </section>
        <section className="panel">
          <div className="phead"><h2>Best sellers</h2><small>last 30 days</small></div>
          {top.length ? (
            <ol className="toplist">{top.map((t) => <li key={t.name}><span>{t.name}</span><b>{t._sum.qty} sold</b></li>)}</ol>
          ) : <p>Appears once orders are paid.</p>}
          <div className="qlinks">
            <Link className="btn btn-sm btn-yellow" href="/admin/products/new">+ Add product</Link>
            <Link className="btn btn-sm btn-line" href="/admin/settings">Delivery &amp; payments</Link>
            <Link className="btn btn-sm btn-line" href="/admin/settings#homepage">Homepage</Link>
          </div>
        </section>
      </div>
    </div>
  );
}

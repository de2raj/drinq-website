import type { Metadata } from "next";
import Link from "next/link";
import { AdminNav } from "@/components/AdminNav";
import { db } from "@/lib/db";
import { dayLabel } from "@/lib/delivery";
import { money } from "@/lib/money";
import { nextStatus, statusLabel } from "@/lib/order-status";
import { changeStatus } from "./actions";

export const metadata: Metadata = { title: "Orders · Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

const FILTERS: [string, string, string[] | null][] = [
  ["all", "All", null],
  ["AWAITING_PAYMENT", "Awaiting payment", ["AWAITING_PAYMENT"]],
  ["todo", "To prepare", ["PAID", "PREPARING"]],
  ["out", "Out / ready", ["OUT_FOR_DELIVERY", "READY_FOR_COLLECTION"]],
  ["done", "Completed", ["DELIVERED", "COLLECTED"]],
  ["CANCELLED", "Cancelled", ["CANCELLED"]],
];

export default async function Orders({ searchParams }: { searchParams: Promise<{ s?: string; q?: string }> }) {
  const sp = await searchParams;
  const f = FILTERS.find(([k]) => k === sp.s) ?? FILTERS[0];
  const q = String(sp.q ?? "").trim();
  const all = await db.order.findMany({ orderBy: { id: "desc" }, take: 500, include: { lines: true } });
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const base = all.filter((o) => words.every((w) => `${o.number} ${o.name} ${o.email} ${o.phone} ${o.postal}`.toLowerCase().includes(w)));
  const list = base.filter((o) => !f[2] || f[2].includes(o.status));
  const href = (s: string) => `/admin/orders?${new URLSearchParams({ ...(s !== "all" ? { s } : {}), ...(q ? { q } : {}) })}`;

  return (
    <div className="wrap admin">
      <AdminNav active="orders" />
      <div className="atool">
        <form className="asearch" action="/admin/orders">
          {f[0] !== "all" && <input type="hidden" name="s" value={f[0]} />}
          <input name="q" defaultValue={q} placeholder="Search order no., name, phone" aria-label="Search orders" />
          <button className="btn btn-sm">Search</button>
          {q && <Link className="clear" href={href(f[0])}>Clear</Link>}
        </form>
        <Link className="btn btn-sm" href="/admin/orders/new">+ New order</Link>
      </div>
      <div className="chips">
        {FILTERS.map(([k, label, st]) => (
          <Link key={k} className="chip" aria-pressed={f[0] === k} href={href(k)}>
            {label} <b>{base.filter((o) => !st || st.includes(o.status)).length}</b>
          </Link>
        ))}
      </div>
      <div className="olist big">
        {list.length > 0 && <div className="ohdr orow"><span>Order</span><span>Customer</span><span>Delivery</span><span>Total</span><span>Status</span><span>Next step</span></div>}
        {list.map((o) => {
          const next = nextStatus(o.status, o.deliveryMethod);
          return (
            <div key={o.id} className="orow">
              <Link href={`/admin/orders/${o.id}`} className="ocell">
                <b>{o.number}</b>{o.isTest && <i className="ttag">TEST</i>}
                <small>{o.createdAt.toLocaleString("en-SG", { timeZone: "Asia/Singapore", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</small>
              </Link>
              <Link href={`/admin/orders/${o.id}`} className="ocell">
                <b>{o.name}</b><small>{o.phone}</small>
              </Link>
              <span className="ocell"><b>{o.deliveryLabel || "Delivery"}</b><small>{o.deliveryDate ? dayLabel(o.deliveryDate) : ""}</small></span>
              <span className="ocell"><b>{money(o.total)}</b><small>{o.lines.reduce((a, l) => a + l.qty, 0)} items</small></span>
              <span className={`spill s-${o.status}`}>{statusLabel(o.status)}</span>
              {next ? (
                <form action={changeStatus}>
                  <input type="hidden" name="id" value={o.id} /><input type="hidden" name="status" value={next} />
                  <button className="btn btn-sm">→ {statusLabel(next)}</button>
                </form>
              ) : <span />}
            </div>
          );
        })}
        {!list.length && <p className="empty">No orders here.</p>}
      </div>
    </div>
  );
}

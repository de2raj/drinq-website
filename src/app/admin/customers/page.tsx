import type { Metadata } from "next";
import Link from "next/link";
import { AdminNav } from "@/components/AdminNav";
import { db } from "@/lib/db";
import { money } from "@/lib/money";
import { PAID_STATUSES } from "@/lib/order-status";

export const metadata: Metadata = { title: "Customers · Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Everyone who has ordered, grouped by email (no customer accounts yet). */
export default async function Customers({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = String((await searchParams).q ?? "").trim().toLowerCase();
  const orders = await db.order.findMany({ orderBy: { id: "desc" }, select: { id: true, name: true, email: true, phone: true, total: true, status: true, createdAt: true, isTest: true } });
  const map = new Map<string, { name: string; email: string; phone: string; orders: number; spent: number; last: Date; lastId: number; test: boolean }>();
  for (const o of orders) {
    const c = map.get(o.email);
    const paid = PAID_STATUSES.includes(o.status as never) ? o.total : 0;
    if (c) { c.orders++; c.spent += paid; c.test &&= o.isTest; }
    else map.set(o.email, { name: o.name, email: o.email, phone: o.phone, orders: 1, spent: paid, last: o.createdAt, lastId: o.id, test: o.isTest });
  }
  const list = [...map.values()].filter((c) => !q || `${c.name} ${c.email} ${c.phone}`.toLowerCase().includes(q)).sort((a, b) => b.spent - a.spent || +b.last - +a.last);

  return (
    <div className="wrap admin">
      <AdminNav active="customers" />
      <div className="atool">
        <form className="asearch" action="/admin/customers">
          <input name="q" defaultValue={q} placeholder="Search name, email, phone" aria-label="Search customers" />
          <button className="btn btn-sm">Search</button>
          {q && <Link className="clear" href="/admin/customers">Clear</Link>}
        </form>
        <Link className="btn btn-sm" href="/admin/orders/new">+ New order</Link>
      </div>
      <p className="acount">{list.length} customers</p>
      <div className="olist big">
        {list.length > 0 && <div className="ohdr orow crow"><span>Customer</span><span>Phone</span><span>Orders</span><span>Total paid</span><span /></div>}
        {list.map((c) => (
          <div className="orow crow" key={c.email}>
            <span className="ocell"><b>{c.name}</b>{c.test && <i className="ttag">TEST</i>}<small>{c.email}</small></span>
            <span className="ocell"><a className="u" href={`tel:${c.phone}`}>{c.phone}</a></span>
            <span className="ocell"><b>{c.orders} {c.orders === 1 ? "order" : "orders"}</b><small>last {c.last.toLocaleDateString("en-SG", { timeZone: "Asia/Singapore", day: "numeric", month: "short" })}</small></span>
            <span className="ocell"><b>{money(c.spent)}</b><small>paid</small></span>
            <span className="obtns">
              <Link className="btn btn-sm btn-line" href={`/admin/orders?q=${encodeURIComponent(c.email)}`}>Orders</Link>
              <Link className="btn btn-sm" href={`/admin/orders/new?customer=${encodeURIComponent(c.email)}`}>New order</Link>
            </span>
          </div>
        ))}
        {!list.length && <p className="empty">No customers yet.</p>}
      </div>
    </div>
  );
}

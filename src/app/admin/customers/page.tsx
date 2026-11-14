import type { Metadata } from "next";
import Link from "next/link";
import { AdminNav } from "@/components/AdminNav";
import { db } from "@/lib/db";
import { summarise } from "@/lib/loyalty";
import { money } from "@/lib/money";
import { PAID_STATUSES } from "@/lib/order-status";

export const metadata: Metadata = { title: "Customers · Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

const FILTERS = [["all", "All"], ["members", "With account"], ["guests", "Guests"], ["points", "Have points"], ["vip", "VIP"], ["lapsed", "No order in 60 days"], ["offers", "Want offers"]] as const;
type F = (typeof FILTERS)[number][0];

/** The CRM: every shopper, with spend, points and tags. */
export default async function Customers({ searchParams }: { searchParams: Promise<{ q?: string; f?: string }> }) {
  const sp = await searchParams;
  const q = String(sp.q ?? "").trim();
  const f = (FILTERS.some(([k]) => k === sp.f) ? sp.f : "all") as F;
  const rows = await db.customer.findMany({
    orderBy: { id: "desc" },
    include: { orders: { select: { total: true, status: true, createdAt: true, isTest: true } }, points: { select: { change: true, expiresAt: true, createdAt: true } } },
  });
  const now = new Date().getTime();
  const list = rows.map((c) => {
    const paid = c.orders.filter((o) => PAID_STATUSES.includes(o.status as never));
    const last = c.orders.reduce<Date | null>((a, o) => (!a || o.createdAt > a ? o.createdAt : a), null);
    return { ...c, spent: paid.reduce((a, o) => a + o.total, 0), count: c.orders.length, last, pts: summarise(c.points).balance,
      test: c.orders.length > 0 && c.orders.every((o) => o.isTest), tagList: c.tags ? c.tags.split("|") : [] };
  });
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const base = list.filter((c) => words.every((w) => `${c.name} ${c.email ?? ""} ${c.phone} ${c.tags}`.toLowerCase().includes(w)));
  const test: Record<F, (c: (typeof list)[number]) => boolean> = {
    all: () => true, members: (c) => !!c.passwordHash, guests: (c) => !c.passwordHash, points: (c) => c.pts > 0,
    vip: (c) => c.tagList.some((t) => t.toLowerCase() === "vip"), lapsed: (c) => !!c.last && now - +c.last > 60 * 86400_000, offers: (c) => c.marketing,
  };
  const shown = base.filter(test[f]).sort((a, b) => b.spent - a.spent || +(b.last ?? 0) - +(a.last ?? 0));
  const href = (k: string) => `/admin/customers?${new URLSearchParams({ ...(k !== "all" ? { f: k } : {}), ...(q ? { q } : {}) })}`;
  const d = (x: Date | null) => (x ? x.toLocaleDateString("en-SG", { timeZone: "Asia/Singapore", day: "numeric", month: "short" }) : "—");

  return (
    <div className="wrap admin">
      <AdminNav active="customers" />
      <div className="atool">
        <form className="asearch" action="/admin/customers">
          {f !== "all" && <input type="hidden" name="f" value={f} />}
          <input name="q" defaultValue={q} placeholder="Search name, email, phone, tag" aria-label="Search customers" />
          <button className="btn btn-sm">Search</button>
          {q && <Link className="clear" href={href(f)}>Clear</Link>}
        </form>
        <Link className="btn btn-sm" href="/admin/orders/new">+ New order</Link>
      </div>
      <div className="chips">
        {FILTERS.map(([k, label]) => <Link key={k} className="chip" aria-pressed={f === k} href={href(k)}>{label} <b>{base.filter(test[k]).length}</b></Link>)}
      </div>
      <div className="olist big">
        {shown.length > 0 && <div className="ohdr orow crow2"><span>Customer</span><span>Phone</span><span>Orders</span><span>Total paid</span><span>Points</span><span /></div>}
        {shown.map((c) => (
          <div className="orow crow2" key={c.id}>
            <Link href={`/admin/customers/${c.id}`} className="ocell">
              <b>{c.name || "No name"}</b>{c.test && <i className="ttag">TEST</i>}{c.tagList.map((t) => <i key={t} className="ctag">{t}</i>)}
              <small>{c.email || "No email"}{c.passwordHash ? " · has account" : ""}</small>
            </Link>
            <span className="ocell">{c.phone ? <a className="u" href={`tel:${c.phone}`}>{c.phone}</a> : "—"}</span>
            <span className="ocell"><b>{c.count} {c.count === 1 ? "order" : "orders"}</b><small>last {d(c.last)}</small></span>
            <span className="ocell"><b>{money(c.spent)}</b></span>
            <span className="ocell"><b>{c.pts}</b><small>points</small></span>
            <span className="obtns">
              <Link className="btn btn-sm btn-line" href={`/admin/customers/${c.id}`}>Open</Link>
              <Link className="btn btn-sm" href={`/admin/orders/new?customer=${encodeURIComponent(c.email ?? c.phone)}`}>New order</Link>
            </span>
          </div>
        ))}
        {!shown.length && <p className="empty">No customers here.</p>}
      </div>
    </div>
  );
}

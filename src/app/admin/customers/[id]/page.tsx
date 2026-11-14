import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminNav } from "@/components/AdminNav";
import { db } from "@/lib/db";
import { summarise } from "@/lib/loyalty";
import { money } from "@/lib/money";
import { PAID_STATUSES, statusLabel } from "@/lib/order-status";
import { getSetting } from "@/lib/settings";
import { changePoints, saveCustomer, setPassword } from "../actions";

export const metadata: Metadata = { title: "Customer · Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

const SAVED: Record<string, string> = { details: "Details saved.", points: "Points updated.", password: "Password set. Tell the customer their new password." };
const ERRORS: Record<string, string> = { email: "Another customer already uses that email.", password: "Passwords need at least 8 characters." };

export default async function CustomerPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }> }) {
  const id = Number((await params).id);
  const sp = await searchParams;
  const c = Number.isInteger(id) ? await db.customer.findUnique({
    where: { id },
    include: { orders: { orderBy: { id: "desc" }, include: { lines: true } }, points: { orderBy: { id: "desc" } } },
  }) : null;
  if (!c) notFound();
  const l = await getSetting("loyalty");
  const pts = summarise(c.points);
  const paid = c.orders.filter((o) => PAID_STATUSES.includes(o.status as never));
  const spent = paid.reduce((a, o) => a + o.total, 0);
  const first = c.orders.at(-1)?.createdAt, last = c.orders[0]?.createdAt;
  // What they buy most.
  const fav = new Map<string, number>();
  for (const o of paid) for (const ln of o.lines) fav.set(ln.name, (fav.get(ln.name) ?? 0) + ln.qty);
  const top = [...fav.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const d = (x?: Date | null) => (x ? x.toLocaleDateString("en-SG", { timeZone: "Asia/Singapore", day: "numeric", month: "short", year: "numeric" }) : "—");

  return (
    <div className="wrap admin">
      <AdminNav active="customers" />
      <div className="ohead">
        <div>
          <Link className="u" href="/admin/customers">← All customers</Link>
          <h2 className="display atitle">{c.name || "No name"}</h2>
          <small>{c.passwordHash ? "Has an account" : "Guest (no account yet)"} · customer since {d(c.createdAt)}</small>
        </div>
        <div className="onav">
          <Link className="btn btn-sm" href={`/admin/orders/new?customer=${encodeURIComponent(c.email ?? c.phone)}`}>+ New order</Link>
          {c.phone && <a className="btn btn-sm btn-line" href={`https://wa.me/65${c.phone}`} target="_blank" rel="noopener">WhatsApp</a>}
          {c.email && <a className="btn btn-sm btn-line" href={`mailto:${c.email}`}>Email</a>}
        </div>
      </div>
      {sp.saved && SAVED[sp.saved] && <div className="notice">{SAVED[sp.saved]}</div>}
      {sp.error && ERRORS[sp.error] && <div className="notice bad">{ERRORS[sp.error]}</div>}

      <div className="tiles4" style={{ marginBottom: 16 }}>
        <div className="kpi"><span>Total paid</span><b>{money(spent)}</b><small>{paid.length} paid orders</small></div>
        <div className="kpi"><span>Average order</span><b>{money(paid.length ? Math.round(spent / paid.length) : 0)}</b><small>{c.orders.length} orders in all</small></div>
        <div className="kpi"><span>Points</span><b>{pts.balance}</b><small>worth {money(Math.floor(pts.balance / l.block) * l.blockValue)}</small></div>
        <div className="kpi"><span>Last order</span><b>{last ? d(last) : "—"}</b><small>first {d(first)}</small></div>
      </div>

      <div className="pgrid">
        <div>
          <section className="panel">
            <h2>Orders</h2>
            {c.orders.length ? (
              <div className="alist">
                {c.orders.map((o) => (
                  <Link key={o.id} href={`/admin/orders/${o.id}`} className="arow2">
                    <span><b>{o.number}</b>{o.isTest && <i className="ttag">TEST</i>}<small>{d(o.createdAt)} · {o.deliveryLabel}{o.pointsUsed ? ` · used ${o.pointsUsed} pts` : ""}{o.pointsEarned ? ` · earned ${o.pointsEarned} pts` : ""}</small></span>
                    <span className={`spill s-${o.status}`}>{statusLabel(o.status)}</span>
                    <b>{money(o.total)}</b>
                  </Link>
                ))}
              </div>
            ) : <p>No orders yet.</p>}
          </section>
          {top.length > 0 && (
            <section className="panel">
              <h2>Buys most</h2>
              <div className="alist">{top.map(([n, q]) => <div key={n} className="arow2"><span>{n}</span><span /><b>{q}×</b></div>)}</div>
            </section>
          )}
          <section className="panel">
            <h2>Points</h2>
            <p>Balance <b>{pts.balance}</b>{pts.expiring ? ` · ${pts.expiring.points} expire on ${d(pts.expiring.date)}` : ""}</p>
            <form action={changePoints} className="ptsform">
              <input type="hidden" name="id" value={c.id} />
              <select name="dir" className="sel" aria-label="Add or remove"><option value="add">Add</option><option value="remove">Remove</option></select>
              <input name="points" inputMode="numeric" placeholder="Points" aria-label="Points" required />
              <input name="reason" placeholder="Reason (e.g. birthday, used in store)" aria-label="Reason" />
              <button className="btn btn-sm">Save</button>
            </form>
            {c.points.length > 0 && (
              <div className="alist">
                {c.points.map((e) => (
                  <div key={e.id} className="arow2"><span>{e.reason}<small>{d(e.createdAt)}{e.by ? ` · by ${e.by}` : ""}{e.expiresAt && e.change > 0 ? ` · expires ${d(e.expiresAt)}` : ""}</small></span><span /><b className={e.change < 0 ? "neg" : "pos"}>{e.change > 0 ? "+" : ""}{e.change}</b></div>
                ))}
              </div>
            )}
          </section>
        </div>
        <div>
          <form action={saveCustomer} className="panel">
            <h2>Details</h2>
            <input type="hidden" name="id" value={c.id} />
            <div className="fields">
              <div className="field full"><label>Name</label><input name="name" defaultValue={c.name} /></div>
              <div className="field"><label>Email</label><input name="email" type="email" defaultValue={c.email ?? ""} /></div>
              <div className="field"><label>Mobile</label><input name="phone" defaultValue={c.phone} /></div>
              <div className="field full"><label>Address</label><input name="address" defaultValue={c.address} /></div>
              <div className="field"><label>Unit</label><input name="unit" defaultValue={c.unit} /></div>
              <div className="field"><label>Postal code</label><input name="postal" defaultValue={c.postal} /></div>
              <div className="field"><label>Birthday</label><input name="birthday" type="date" defaultValue={c.birthday} /></div>
              <div className="field"><label>Tags (comma between)</label><input name="tags" defaultValue={c.tags.split("|").join(", ")} placeholder="VIP, Corporate" /></div>
              <div className="field full"><label>Staff notes</label><textarea name="notes" rows={4} defaultValue={c.notes ?? ""} /></div>
            </div>
            <label className="agree"><input type="checkbox" className="check" name="marketing" defaultChecked={c.marketing} /><span>Wants deals and offers</span></label>
            <button className="btn">Save details</button>
          </form>
          {c.email && <form action={setPassword} className="panel">
            <h2>{c.passwordHash ? "Reset password" : "Create their account"}</h2>
            <p className="small">{c.passwordHash ? "Set a new password if they forgot theirs, then tell them." : "Give them a password so they can sign in and use their points."}</p>
            <input type="hidden" name="id" value={c.id} />
            <div className="field"><label>New password (8+ characters)</label><input name="password" type="text" autoComplete="off" minLength={8} required /></div>
            <button className="btn btn-line">{c.passwordHash ? "Set new password" : "Create account"}</button>
          </form>}
        </div>
      </div>
    </div>
  );
}

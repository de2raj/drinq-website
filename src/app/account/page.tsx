import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DetailsForm, PasswordForm } from "@/components/AccountForms";
import { currentCustomer } from "@/lib/customers";
import { db } from "@/lib/db";
import { pointsOf } from "@/lib/loyalty";
import { money } from "@/lib/money";
import { statusLabel } from "@/lib/order-status";
import { getSetting } from "@/lib/settings";
import { logout } from "./actions";

export const metadata: Metadata = { title: "My account", robots: { index: false } };
export const dynamic = "force-dynamic";

const day = (d: Date) => d.toLocaleDateString("en-SG", { timeZone: "Asia/Singapore", day: "numeric", month: "long", year: "numeric" });

export default async function Account() {
  const me = await currentCustomer();
  if (!me) redirect("/account/login");
  const [l, pts, orders, ledger] = await Promise.all([
    getSetting("loyalty"), pointsOf(me.id),
    db.order.findMany({ where: { customerId: me.id }, orderBy: { id: "desc" }, take: 50, select: { number: true, token: true, createdAt: true, total: true, status: true, deliveryLabel: true, pointsEarned: true } }),
    db.pointsEntry.findMany({ where: { customerId: me.id }, orderBy: { id: "desc" }, take: 50 }),
  ]);
  const worth = Math.floor(pts.balance / l.block) * l.blockValue;
  return (
    <div className="wrap">
      <div className="chero acchead">
        <h1 className="display">Hi {me.name.split(" ")[0] || "there"}</h1>
        <form action={logout}><button className="btn btn-sm btn-line">Sign out</button></form>
      </div>
      <div className="accgrid">
        <div>
          {l.enabled && (
            <section className="panel ptscard">
              <div className="pbig"><span className="display">{pts.balance}</span><small>points</small></div>
              <p>Worth <b>{money(worth)}</b> off. Use them at checkout.</p>
              {pts.expiring && <p className="small">{pts.expiring.points} points expire on {day(pts.expiring.date)}.</p>}
              <p className="small">You earn {l.earnPerDollar} point{l.earnPerDollar === 1 ? "" : "s"} per $1 on paid orders. {l.block} points = {money(l.blockValue)} off.</p>
              <Link className="btn btn-sm" href="/">Shop now</Link>
            </section>
          )}
          <section className="panel">
            <h2>Your orders</h2>
            {orders.length ? (
              <div className="alist">
                {orders.map((o) => (
                  <Link key={o.number} href={`/order/${o.token}`} className="arow2">
                    <span><b>{o.number}</b><small>{day(o.createdAt)} · {o.deliveryLabel}</small></span>
                    <span className={`spill s-${o.status}`}>{statusLabel(o.status)}</span>
                    <b>{money(o.total)}</b>
                  </Link>
                ))}
              </div>
            ) : <p>No orders yet.</p>}
          </section>
          {ledger.length > 0 && (
            <section className="panel">
              <h2>Points history</h2>
              <div className="alist">
                {ledger.map((e) => (
                  <div key={e.id} className="arow2"><span>{e.reason}<small>{day(e.createdAt)}{e.expiresAt && e.change > 0 ? ` · expires ${day(e.expiresAt)}` : ""}</small></span><span /><b className={e.change < 0 ? "neg" : "pos"}>{e.change > 0 ? "+" : ""}{e.change}</b></div>
                ))}
              </div>
            </section>
          )}
        </div>
        <div>
          <DetailsForm d={{ name: me.name, phone: me.phone, address: me.address, unit: me.unit, postal: me.postal, birthday: me.birthday, marketing: me.marketing }} />
          <PasswordForm />
          <p className="small">Signed in as {me.email}</p>
        </div>
      </div>
    </div>
  );
}

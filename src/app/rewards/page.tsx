import type { Metadata } from "next";
import Link from "next/link";
import { currentCustomer } from "@/lib/customers";
import { pointsOf } from "@/lib/loyalty";
import { money } from "@/lib/money";
import { getSetting } from "@/lib/settings";

export const metadata: Metadata = { title: "DRINQ Rewards", description: "Earn points on every order and use them for money off." };
export const dynamic = "force-dynamic";

export default async function Rewards() {
  const [l, me] = await Promise.all([getSetting("loyalty"), currentCustomer()]);
  const pts = me ? (await pointsOf(me.id)).balance : 0;
  const per = l.earnPerDollar === 1 ? "1 point" : `${l.earnPerDollar} points`;
  return (
    <div className="wrap">
      <section className="rhero">
        <div>
          <span className="eyebrow">DRINQ Rewards</span>
          <h1 className="display">Drink. Earn. Save.</h1>
          <p>Join free and earn {per} for every $1 you spend. Every {l.block} points takes {money(l.blockValue)} off your next order.</p>
          {me ? (
            <div className="rme"><b>{pts} points</b><span>worth {money(Math.floor(pts / l.block) * l.blockValue)}</span><Link className="btn" href="/account">My account →</Link></div>
          ) : (
            <div className="rbtns"><Link className="btn" href="/account/register">Join free</Link><Link className="btn btn-line" href="/account/login">Sign in</Link></div>
          )}
        </div>
        <div className="rcard"><span className="display">{l.block}</span><small>points</small><b>= {money(l.blockValue)} off</b></div>
      </section>
      <section className="rsteps">
        <div className="panel"><span className="n">1</span><h2>Join</h2><p>Create a free account with your email and mobile. Ordered before? Use the same email and mobile and your points come with you.</p></div>
        <div className="panel"><span className="n">2</span><h2>Earn</h2><p>Get {per} for every $1 of drinks once your order is paid. Delivery fees don&apos;t count.</p></div>
        <div className="panel"><span className="n">3</span><h2>Save</h2><p>At checkout, choose how many points to use, in blocks of {l.block}. Each block is {money(l.blockValue)} off.</p></div>
      </section>
      <section className="panel rfine">
        <h2>Good to know</h2>
        <ul>
          {l.expiryMonths > 0 && <li>Points expire {l.expiryMonths} months after you earn them. Your account shows when the next ones expire.</li>}
          <li>Points can&apos;t be used on delivery fees and can&apos;t be exchanged for cash.</li>
          <li>If an order is cancelled, points used on it are given back and points earned on it are removed.</li>
          <li>Only for customers aged 18 and over.</li>
        </ul>
      </section>
    </div>
  );
}

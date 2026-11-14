import type { Metadata } from "next";
import { RegisterForm } from "@/components/AccountForms";
import { getSetting } from "@/lib/settings";
import { money } from "@/lib/money";

export const metadata: Metadata = { title: "Create an account", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Register({ searchParams }: { searchParams: Promise<{ next?: string; email?: string }> }) {
  const sp = await searchParams;
  const l = await getSetting("loyalty");
  return (
    <div className="wrap anarrow">
      <div className="chero"><h1 className="display">Create an account</h1>
        {l.enabled && <p>Earn {l.earnPerDollar} point{l.earnPerDollar === 1 ? "" : "s"} for every $1. Every {l.block} points = {money(l.blockValue)} off your next order.
          Ordered with us before? Use the same email and mobile number and your points come with you.</p>}
      </div>
      <RegisterForm next={sp.next ?? "/account"} email={sp.email ?? ""} />
    </div>
  );
}

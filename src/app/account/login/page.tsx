import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/AccountForms";
import { currentCustomer } from "@/lib/customers";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = (await searchParams).next ?? "/account";
  if (await currentCustomer()) redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/account");
  return (
    <div className="wrap anarrow">
      <div className="chero"><h1 className="display">Sign in</h1><p>See your points, past orders and saved details.</p></div>
      <LoginForm next={next} />
    </div>
  );
}

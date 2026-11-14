import type { Metadata } from "next";
import { CheckoutForm } from "@/components/CheckoutForm";
import { arrival } from "@/lib/delivery";
import { getSetting } from "@/lib/settings";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const [methods, payments] = await Promise.all([getSetting("delivery"), getSetting("payments")]);
  const options = methods.filter((m) => m.enabled).map((m) => ({
    id: m.id, name: m.name, fee: m.fee, freeFrom: m.freeFrom, address: m.address ?? "",
    notice: m.notice.split("\n").map((l) => l.trim()).filter(Boolean),
    arrival: arrival(m),
  }));
  return (
    <CheckoutForm
      methods={options}
      payments={payments.options.filter((p) => p.enabled).map(({ id, name, detail }) => ({ id, name, detail }))}
      testMode={payments.testMode}
    />
  );
}

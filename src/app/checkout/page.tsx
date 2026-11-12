import type { Metadata } from "next";
import { CheckoutForm } from "@/components/CheckoutForm";
import { deliveryDays } from "@/lib/delivery";
import { stripeEnabled } from "@/lib/stripe";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };
export const dynamic = "force-dynamic";

export default function CheckoutPage() {
  return <CheckoutForm days={deliveryDays()} cardEnabled={stripeEnabled()} />;
}

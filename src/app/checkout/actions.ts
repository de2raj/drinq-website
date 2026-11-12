"use server";
import { headers } from "next/headers";
import { placeOrder, type CheckoutInput, type CheckoutResult } from "@/lib/orders";

export async function submitOrder(input: CheckoutInput): Promise<CheckoutResult> {
  const h = await headers();
  const site = process.env.SITE_URL || `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  try {
    return await placeOrder(input, site.replace(/\/$/, ""));
  } catch (e) {
    console.error("Checkout failed", e);
    return { ok: false, errors: { form: "Something went wrong placing your order. Nothing was charged — please try again." } };
  }
}

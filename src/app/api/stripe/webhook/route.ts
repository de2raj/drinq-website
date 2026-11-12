import { markPaid } from "@/lib/orders";
import { verifyWebhook } from "@/lib/stripe";

/** Stripe → "checkout.session.completed" / "checkout.session.async_payment_succeeded" marks the order paid. */
export async function POST(req: Request) {
  const body = await req.text();
  if (!(await verifyWebhook(body, req.headers.get("stripe-signature")))) return new Response("Bad signature", { status: 400 });
  const evt = JSON.parse(body);
  const s = evt.data?.object;
  if ((evt.type === "checkout.session.completed" || evt.type === "checkout.session.async_payment_succeeded") && s?.payment_status === "paid") {
    await markPaid(s.client_reference_id, s.id);
  }
  return Response.json({ received: true });
}

import "server-only";

/** Stripe Checkout through its REST API (no SDK). Off unless STRIPE_SECRET_KEY is set. */
export const stripeEnabled = () => !!process.env.STRIPE_SECRET_KEY;

async function call(path: string, method: "GET" | "POST", form?: Record<string, string>) {
  const r = await fetch(`https://api.stripe.com/v1/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      ...(form ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body: form ? new URLSearchParams(form) : undefined,
    cache: "no-store",
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data?.error?.message || `Stripe ${r.status}`);
  return data;
}

type Line = { name: string; unitPrice: number; qty: number };

export async function createCheckoutSession(o: {
  number: string; token: string; email: string; lines: Line[]; deliveryFee: number; siteUrl: string;
}) {
  const f: Record<string, string> = {
    mode: "payment",
    customer_email: o.email,
    client_reference_id: o.number,
    "metadata[order]": o.number,
    "payment_intent_data[description]": `DRINQ order ${o.number}`,
    success_url: `${o.siteUrl}/order/${o.token}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${o.siteUrl}/order/${o.token}?cancelled=1`,
    expires_at: String(Math.floor(Date.now() / 1000) + 60 * 60),
  };
  const lines = [...o.lines];
  if (o.deliveryFee) lines.push({ name: "Delivery", unitPrice: o.deliveryFee, qty: 1 });
  lines.forEach((l, i) => {
    f[`line_items[${i}][quantity]`] = String(l.qty);
    f[`line_items[${i}][price_data][currency]`] = "sgd";
    f[`line_items[${i}][price_data][unit_amount]`] = String(l.unitPrice);
    f[`line_items[${i}][price_data][product_data][name]`] = l.name;
  });
  return (await call("checkout/sessions", "POST", f)) as { id: string; url: string };
}

export const getCheckoutSession = (id: string) =>
  call(`checkout/sessions/${encodeURIComponent(id)}`, "GET") as Promise<{ id: string; payment_status: string; client_reference_id: string }>;

/** Checks a webhook's Stripe-Signature header (HMAC-SHA256, 5-minute window). */
export async function verifyWebhook(payload: string, header: string | null) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !header) return false;
  const parts = Object.fromEntries(header.split(",").map((kv) => kv.split("=") as [string, string]));
  const t = parts.t;
  const sigs = header.split(",").filter((kv) => kv.startsWith("v1=")).map((kv) => kv.slice(3));
  if (!t || !sigs.length || Math.abs(Date.now() / 1000 - Number(t)) > 300) return false;
  const { createHmac, timingSafeEqual } = await import("node:crypto");
  const expected = createHmac("sha256", secret).update(`${t}.${payload}`).digest("hex");
  return sigs.some((s) => s.length === expected.length && timingSafeEqual(Buffer.from(s), Buffer.from(expected)));
}

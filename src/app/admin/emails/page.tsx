import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { AdminNav } from "@/components/AdminNav";
import { allProducts } from "@/lib/catalogue";
import { arrival } from "@/lib/delivery";
import { buildEmail, EMAILS, type EmailKind, type EmailOrder } from "@/lib/emails";
import { getSetting } from "@/lib/settings";

export const metadata: Metadata = { title: "Emails · Admin", robots: { index: false } };
export const dynamic = "force-dynamic";


export default async function Emails({ searchParams }: { searchParams: Promise<{ kind?: string; method?: string }> }) {
  const sp = await searchParams;
  const h = await headers();
  const SITE = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const [methods, payments, products] = await Promise.all([getSetting("delivery"), getSetting("payments"), allProducts()]);
  const abs = (u: string) => (u.startsWith("/") ? SITE + u : u);
  const pick = (slug: string) => products.find((p) => p.slug.includes(slug)) ?? products[0];
  const kind = (EMAILS.find((e) => e.kind === sp.kind)?.kind ?? "PLACED") as EmailKind;
  const def = EMAILS.find((e) => e.kind === kind)!;
  const enabled = methods.filter((m) => m.enabled);
  let m = enabled.find((x) => x.id === sp.method) ?? enabled[0];
  if (def.collect === true) m = methods.find((x) => x.id === "COLLECT") ?? m;
  if (def.collect === false && m.id === "COLLECT") m = enabled.find((x) => x.id !== "COLLECT") ?? m;
  const a = arrival(m);
  const d = a.dates[0];
  const items = [{ p: pick("tequila-rose"), qty: 2 }, { p: pick("black-tears"), qty: 1 }];
  const subtotal = items.reduce((s, x) => s + x.p.price * x.qty, 0);
  const fee = m.freeFrom > 0 && subtotal >= m.freeFrom ? 0 : m.fee;
  const sample: EmailOrder = {
    number: "DQW-00012", token: "0".repeat(32), name: "Alex Tan", email: "alex@example.com", phone: "91234567",
    address: "10 Example Street", unit: "#05-12", postal: "123456", notes: "Please call when downstairs",
    deliveryMethod: m.id, deliveryLabel: m.name, deliveryDate: a.date || d?.date || "",
    deliverySlot: a.pick === "slot" ? d?.slots?.[0]?.label ?? "" : a.pick === "date" ? d?.detail ?? "" : a.slotText,
    paymentMethod: "PAYNOW", paymentName: payments.options.find((p) => p.id === "PAYNOW")?.name ?? "PayNow",
    subtotal, deliveryFee: fee, total: subtotal + fee,
    lines: items.map(({ p, qty }) => ({ name: p.name, size: p.size, qty, lineTotal: p.price * qty, image: abs(p.thumb || p.image) })),
  };
  const mail = buildEmail(kind, sample, SITE, methods.find((x) => x.id === "COLLECT")?.address ?? "");
  const q = (k: string, me = m.id) => `/admin/emails?kind=${k}&method=${me}`;

  return (
    <div className="wrap admin">
      <AdminNav active="emails" />
      <p className="snote">What customers receive at each step. Preview only: no emails are sent yet.</p>
      <div className="mtabs">
        {EMAILS.map((e) => <Link key={e.kind} href={q(e.kind)} aria-current={e.kind === kind ? "page" : undefined}>{e.name}</Link>)}
      </div>
      {def.collect === undefined && (
        <div className="mtabs small">
          {enabled.map((x) => <Link key={x.id} href={q(kind, x.id)} aria-current={x.id === m.id ? "page" : undefined}>{x.name}</Link>)}
        </div>
      )}
      <div className="mailbox">
        <div className="mailhead">
          <div><span>Sent</span><b>{def.when}</b></div>
          <div><span>From</span><b>DRINQ &lt;orders@drinq.sg&gt;</b></div>
          <div><span>Subject</span><b>{mail.subject}</b></div>
        </div>
        <iframe title="Email preview" srcDoc={mail.html} className="mailframe" />
      </div>
    </div>
  );
}

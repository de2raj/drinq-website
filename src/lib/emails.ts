/**
 * Customer emails for each order step. Built as plain HTML tables with inline styles,
 * so they look the same in Gmail, Outlook and Apple Mail.
 * Nothing here sends mail: it only builds the subject and HTML (previewed in /admin/emails).
 */
import { SHOP } from "./config";
import { dayLabel } from "./delivery";
import { money } from "./money";

export type EmailKind = "PLACED" | "PAID" | "OUT_FOR_DELIVERY" | "READY_FOR_COLLECTION" | "DELIVERED" | "COLLECTED" | "CANCELLED";

export const EMAILS: { kind: EmailKind; name: string; when: string; collect?: boolean }[] = [
  { kind: "PLACED", name: "Order received", when: "As soon as the customer places the order (still to pay)" },
  { kind: "PAID", name: "Order confirmed", when: "When the payment is received" },
  { kind: "OUT_FOR_DELIVERY", name: "Out for delivery", when: "When staff mark the order Out for delivery", collect: false },
  { kind: "READY_FOR_COLLECTION", name: "Ready for collection", when: "When staff mark the order Ready for collection", collect: true },
  { kind: "DELIVERED", name: "Delivered", when: "When staff mark the order Delivered", collect: false },
  { kind: "COLLECTED", name: "Collected", when: "When staff mark the order Collected", collect: true },
  { kind: "CANCELLED", name: "Order cancelled", when: "When staff cancel the order" },
];

export type EmailOrder = {
  number: string; token: string; name: string; email: string; phone: string;
  address: string; unit: string; postal: string; notes: string;
  deliveryMethod: string; deliveryLabel: string; deliveryDate: string; deliverySlot: string;
  paymentMethod: string; paymentName: string;
  subtotal: number; deliveryFee: number; total: number;
  lines: { name: string; size: string; qty: number; lineTotal: number; image?: string }[];
};

const Y = "#FFC515", INK = "#231F20", PAPER = "#FFFBEF", LINE = "#E8E2D0";
const FONT = "'Inter',Helvetica,Arial,sans-serif";
const DISPLAY = "'Montserrat','Arial Black',Helvetica,Arial,sans-serif";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

type Copy = { subject: string; pre: string; title: string; lead: string; body: string[]; cta?: string; step: number; tone?: "stop" };

function copy(kind: EmailKind, o: EmailOrder, collectAt: string): Copy {
  const first = esc(o.name.split(" ")[0] || o.name);
  const when = [dayLabel(o.deliveryDate), o.deliverySlot].filter(Boolean).join(", ");
  const collect = o.deliveryMethod === "COLLECT";
  switch (kind) {
    case "PLACED": return {
      subject: `We've got your order ${o.number} · please complete payment`, pre: `Pay ${money(o.total)} to confirm your order.`,
      title: "Order received", lead: `Thanks ${first}! Your order is saved. Pay ${money(o.total)} to confirm it.`,
      body: [o.paymentMethod === "PAYNOW"
        ? `Tap the button to open your order page and scan the PayNow QR. Please use <b>${o.number}</b> as the reference.`
        : `Tap the button to finish paying by ${esc(o.paymentName)}.`,
        "We start preparing your order as soon as the payment comes in."],
      cta: `Pay ${money(o.total)} now`, step: 1 };
    case "PAID": return {
      subject: `Order ${o.number} confirmed`, pre: collect ? `Collect from ${when}.` : `Arriving ${when}.`,
      title: "Order confirmed", lead: `Payment received, ${first}. We're getting your drinks ready.`,
      body: [collect ? `You can collect from <b>${esc(when)}</b>. We'll email you again when it's packed and waiting.`
        : `It's booked for <b>${esc(when)}</b>. We'll email you again when it's on the way.`],
      cta: "Track your order", step: 2 };
    case "OUT_FOR_DELIVERY": return {
      subject: `Order ${o.number} is on the way 🚚`, pre: "Your driver is heading to you now.",
      title: "On the way", lead: `Good news, ${first}! Your order has left us and is heading to you.`,
      body: [`Delivering to <b>${esc([o.address, o.unit].filter(Boolean).join(", "))}, Singapore ${esc(o.postal)}</b>.`,
        "Please have your ID ready. We can only hand alcohol to someone aged 18 or over."],
      cta: "Track your order", step: 3 };
    case "READY_FOR_COLLECTION": return {
      subject: `Order ${o.number} is ready for collection`, pre: "Your order is packed and waiting for you.",
      title: "Ready to collect", lead: `Your order is packed and waiting, ${first}.`,
      body: [`Collect at <b>${esc(collectAt)}</b>.`, when ? `Your collection day: <b>${esc(when)}</b>.` : "",
        `Show this email (order <b>${o.number}</b>) and your ID. We can only hand alcohol to someone aged 18 or over.`].filter(Boolean),
      cta: "View your order", step: 3 };
    case "DELIVERED": return {
      subject: `Order ${o.number} delivered. Cheers! 🥂`, pre: "Enjoy your drinks.",
      title: "Delivered", lead: `Your order has been delivered, ${first}. Cheers!`,
      body: [`Something not right? Message us on Telegram with your order number <b>${o.number}</b> and we'll sort it out.`],
      cta: "Shop again", step: 4 };
    case "COLLECTED": return {
      subject: `Order ${o.number} collected. Cheers! 🥂`, pre: "Thanks for collecting your order.",
      title: "Collected", lead: `Thanks for collecting your order, ${first}. Cheers!`,
      body: [`Something not right? Message us on Telegram with your order number <b>${o.number}</b> and we'll sort it out.`],
      cta: "Shop again", step: 4 };
    case "CANCELLED": return {
      subject: `Order ${o.number} cancelled`, pre: "Your order has been cancelled.",
      title: "Order cancelled", lead: `Your order ${o.number} has been cancelled, ${first}.`,
      body: ["If you already paid, we'll refund you in full to the same payment method.", "Questions? Message us on Telegram with your order number."],
      cta: "Back to the shop", step: 0, tone: "stop" };
  }
}

/** Builds one email. `site` is the shop's address, e.g. https://drinq.sg (used for links and the logo). */
export function buildEmail(kind: EmailKind, o: EmailOrder, site: string, collectAt = ""): { subject: string; html: string } {
  const c = copy(kind, o, collectAt);
  const collect = o.deliveryMethod === "COLLECT";
  const orderUrl = `${site}/order/${o.token}`;
  const ctaUrl = kind === "DELIVERED" || kind === "COLLECTED" || kind === "CANCELLED" ? site : orderUrl;
  const steps = collect ? ["Placed", "Paid", "Ready", "Collected"] : ["Placed", "Paid", "On the way", "Delivered"];
  const when = [dayLabel(o.deliveryDate), o.deliverySlot].filter(Boolean).join(", ");

  const progress = c.tone === "stop" ? "" : `
    <tr><td style="padding:22px 0 0">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        ${steps.map((s, i) => {
          const on = i < c.step;
          return `<td width="25%" align="center" style="font:700 11px/1.3 ${FONT};color:${INK};text-transform:uppercase;letter-spacing:.04em">
            <div style="height:6px;border-radius:6px;background:${on ? INK : "rgba(35,31,32,.18)"};margin:0 3px 8px"></div>${s}</td>`;
        }).join("")}
      </tr></table>
    </td></tr>`;

  const row = (k: string, v: string) => v ? `<tr><td style="padding:5px 0;font:600 13px/1.4 ${FONT};color:${INK};width:120px;vertical-align:top">${k}</td><td style="padding:5px 0;font:500 14px/1.4 ${FONT};color:${INK}">${v}</td></tr>` : "";
  const details = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAPER};border:1px solid ${LINE};border-radius:14px">
      <tr><td style="padding:16px 18px">
        <div style="font:900 13px/1 ${DISPLAY};text-transform:uppercase;letter-spacing:.04em;color:${INK};margin-bottom:8px">${collect ? "Collection" : "Delivery"}</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${row("Option", esc(o.deliveryLabel))}
          ${row(collect ? "Collect on" : "Arrives", esc(when))}
          ${collect ? row("Where", esc(collectAt)) : row("To", `${esc(o.name)}<br>${esc([o.address, o.unit].filter(Boolean).join(", "))}<br>Singapore ${esc(o.postal)}`)}
          ${row("Phone", esc(o.phone))}
          ${row("Payment", esc(o.paymentName))}
          ${o.notes ? row("Notes", esc(o.notes)) : ""}
        </table>
      </td></tr>
    </table>`;

  const items = `
    <div style="font:900 13px/1 ${DISPLAY};text-transform:uppercase;letter-spacing:.04em;color:${INK};margin:26px 0 6px">Your order</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${o.lines.map((l) => `<tr>
        <td width="64" style="padding:10px 0;border-bottom:1px solid ${LINE}">
          <div style="width:52px;height:52px;border:2px solid ${INK};border-radius:10px;background:#fff;text-align:center;overflow:hidden">
            ${l.image ? `<img src="${esc(l.image)}" alt="" width="44" height="44" style="display:inline-block;width:44px;height:44px;object-fit:contain;margin-top:4px">` : ""}
          </div></td>
        <td style="padding:10px 8px;border-bottom:1px solid ${LINE};font:600 14px/1.35 ${FONT};color:${INK}">${esc(l.name)}<br><span style="font-weight:500;font-size:12px">Qty ${l.qty}</span></td>
        <td align="right" style="padding:10px 0;border-bottom:1px solid ${LINE};font:700 14px/1 ${FONT};color:${INK};white-space:nowrap">${money(l.lineTotal)}</td>
      </tr>`).join("")}
      <tr><td></td><td style="padding:12px 8px 3px;font:500 14px ${FONT};color:${INK}">Subtotal</td><td align="right" style="padding:12px 0 3px;font:600 14px ${FONT};color:${INK}">${money(o.subtotal)}</td></tr>
      <tr><td></td><td style="padding:3px 8px;font:500 14px ${FONT};color:${INK}">${esc(o.deliveryLabel || "Delivery")}</td><td align="right" style="padding:3px 0;font:600 14px ${FONT};color:${INK}">${o.deliveryFee ? money(o.deliveryFee) : "Free"}</td></tr>
      <tr><td></td><td style="padding:10px 8px 0;font:900 18px ${DISPLAY};color:${INK};text-transform:uppercase">Total</td><td align="right" style="padding:10px 0 0;font:900 20px ${DISPLAY};color:${INK}">${money(o.total)}</td></tr>
    </table>`;

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only"><title>${esc(c.subject)}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Montserrat:wght@800;900&display=swap" rel="stylesheet">
<style>@media (max-width:620px){.card{border-radius:0!important}.pad{padding-left:20px!important;padding-right:20px!important}.hero{font-size:34px!important}}</style>
</head>
<body style="margin:0;padding:0;background:#F3EFE3">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(c.pre)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3EFE3"><tr><td align="center" style="padding:24px 0">
  <table role="presentation" class="card" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#fff;border:2px solid ${INK};border-radius:22px;overflow:hidden">
    <tr><td align="center" style="background:${INK};padding:20px">
      <a href="${site}"><img src="${site}/drinq-logo-yellow.png" alt="DRINQ" width="120" style="display:block;width:120px;height:auto;border:0"></a>
    </td></tr>
    <tr><td class="pad" style="background:${c.tone === "stop" ? "#F2D7D3" : Y};padding:30px 36px 28px">
      <div style="font:800 12px/1 ${FONT};color:${INK};text-transform:uppercase;letter-spacing:.08em">Order ${o.number}</div>
      <div class="hero" style="font:900 40px/1 ${DISPLAY};color:${INK};text-transform:uppercase;letter-spacing:-.02em;margin-top:10px">${c.title}</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${progress}</table>
    </td></tr>
    <tr><td class="pad" style="padding:30px 36px 8px">
      <p style="margin:0 0 12px;font:700 18px/1.4 ${FONT};color:${INK}">${c.lead}</p>
      ${c.body.map((p) => `<p style="margin:0 0 12px;font:500 15px/1.55 ${FONT};color:${INK}">${p}</p>`).join("")}
      ${c.cta ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:18px 0 26px"><tr><td style="background:${INK};border-radius:999px">
        <a href="${ctaUrl}" style="display:inline-block;padding:15px 30px;font:800 15px/1 ${FONT};color:${Y};text-decoration:none">${c.cta} →</a></td></tr></table>` : ""}
      ${details}
      ${items}
    </td></tr>
    <tr><td class="pad" style="padding:22px 36px 30px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${INK};border-radius:14px"><tr>
        <td style="padding:16px 18px;font:600 14px/1.45 ${FONT};color:#fff">Questions about your order?<br><span style="color:${Y}">We reply fastest on Telegram.</span></td>
        <td align="right" style="padding:16px 18px"><a href="${SHOP.telegramUrl}" style="display:inline-block;background:${Y};color:${INK};border-radius:999px;padding:11px 18px;font:800 13px/1 ${FONT};text-decoration:none">Message us</a></td>
      </tr></table>
    </td></tr>
  </table>
  <p style="margin:18px 0 0;font:500 12px/1.6 ${FONT};color:${INK}">${SHOP.company} · UEN ${SHOP.uen}<br>
    You're receiving this because you ordered at <a href="${site}" style="color:${INK}">drinq.sg</a>. For buyers aged 18 and over. Please drink responsibly.</p>
</td></tr></table>
</body></html>`;
  return { subject: c.subject, html };
}

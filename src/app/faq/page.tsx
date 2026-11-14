import { Info } from "@/components/Info";
import { money } from "@/lib/money";
import { getSetting } from "@/lib/settings";

export const metadata = { title: "FAQ" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const methods = (await getSetting("delivery")).filter((m) => m.enabled);
  const QA: [string, string][] = [
    ["What delivery options are there?", methods.map((m) => `${m.name}: ${m.fee ? money(m.fee) : "free"}${m.freeFrom ? `, free from ${money(m.freeFrom)}` : ""}.`).join(" ")],
    ["Do you deliver on Sundays?", "No, we are closed on Sundays. We resume on Monday."],
    ["How can I pay?", "PayNow QR, credit or debit card, Apple Pay, Google Pay or GrabPay."],
    ["Do I need to show ID?", "Yes. You must be 18 or over, and we check ID on delivery or collection."],
    ["Something is wrong with my order", "Message us on Telegram with your order number and we'll sort it out."],
  ];
  return <Info title="FAQ">{QA.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</Info>;
}

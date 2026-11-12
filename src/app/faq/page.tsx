import { Info } from "@/components/Info";
import { SHOP } from "@/lib/config";
import { money } from "@/lib/money";

export const metadata = { title: "FAQ" };
const QA: [string, string][] = [
  ["How fast is delivery?", `Pick a slot at checkout. The earliest is about ${SHOP.minLeadHours} hours after you order, 7 days a week.`],
  ["How much is delivery?", `Free from ${money(SHOP.freeDeliveryFrom)}, otherwise ${money(SHOP.deliveryFee)}.`],
  ["How can I pay?", "PayNow QR, or card, Apple Pay and Google Pay through our secure payment page."],
  ["Do I need to show ID?", "Yes. You must be 18 or over, and we check ID at the door."],
  ["Can I order at night?", "Yes, you can place an order any time. Deliveries run 10am – 10pm because liquor can't be sold between 10.30pm and 7am in Singapore."],
  ["Something is wrong with my order", "Message us on Telegram with your order number and we'll sort it out."],
];
export default function Page() {
  return <Info title="FAQ">{QA.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</Info>;
}

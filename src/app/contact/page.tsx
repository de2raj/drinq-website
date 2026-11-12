import { Info } from "@/components/Info";
import { SHOP } from "@/lib/config";

export const metadata = { title: "Contact us" };
export default function Page() {
  return (
    <Info title="Contact us">
      <p>The fastest way to reach us is Telegram. Include your order number if it&apos;s about an order.</p>
      <p style={{ margin: "20px 0" }}><a className="btn" href={SHOP.telegramUrl} target="_blank" rel="noopener">Message us on Telegram →</a></p>
      <h2>Company</h2>
      <p>{SHOP.company}<br />UEN {SHOP.uen}<br />Singapore</p>
    </Info>
  );
}

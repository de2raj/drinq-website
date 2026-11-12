import { Info } from "@/components/Info";
import { SHOP } from "@/lib/config";

export const metadata = { title: "Privacy" };
export default function Page() {
  return (
    <Info title="Privacy">
      <p><b>Draft — to be reviewed before launch.</b></p>
      <p>{SHOP.company} collects your name, contact details and address only to process and deliver your order, in line with Singapore&apos;s PDPA.</p>
      <p>Card payments are handled by our payment provider; we never see or store your card number.</p>
      <p>To ask about or remove your data, contact us on Telegram.</p>
    </Info>
  );
}

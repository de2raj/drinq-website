import { Info } from "@/components/Info";
import { SHOP } from "@/lib/config";

export const metadata = { title: "Terms" };
export default function Page() {
  return (
    <Info title="Terms">
      <p><b>Draft — to be reviewed before launch.</b></p>
      <h2>Who we are</h2>
      <p>This shop is run by {SHOP.company} (UEN {SHOP.uen}), Singapore.</p>
      <h2>Age</h2>
      <p>You must be 18 or over to buy alcohol. We check ID on delivery and may cancel and refund an order if no one aged 18 or over can receive it.</p>
      <h2>Prices and payment</h2>
      <p>Prices are in Singapore dollars. Your order is confirmed once payment is received.</p>
      <h2>Delivery</h2>
      <p>Deliveries are made in the slot you choose. Liquor is not sold or delivered between 10.30pm and 7am.</p>
      <h2>Returns</h2>
      <p>If an item arrives damaged or wrong, tell us within 24 hours and we will replace or refund it.</p>
    </Info>
  );
}

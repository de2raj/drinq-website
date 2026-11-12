import { Info } from "@/components/Info";
import { SHOP } from "@/lib/config";
import { money } from "@/lib/money";

export const metadata = { title: "Delivery" };
export default function Page() {
  return (
    <Info title="Delivery">
      <p>We deliver across Singapore, 7 days a week.</p>
      <h2>Cost</h2>
      <ul><li>Free on orders of {money(SHOP.freeDeliveryFrom)} or more.</li><li>{money(SHOP.deliveryFee)} on smaller orders.</li></ul>
      <h2>Time slots</h2>
      <p>Choose a slot at checkout: {SHOP.slots.map((s) => s.label).join(", ")}. The earliest slot is about {SHOP.minLeadHours} hours after you order.</p>
      <p>Singapore law does not allow retail sale of liquor between 10.30pm and 7am. Orders placed overnight are delivered from the next available morning slot.</p>
      <h2>ID check</h2>
      <p>We only hand over to someone aged 18 or over. Please have your NRIC, passport or driving licence ready. If no one of age is available, we will rearrange the delivery.</p>
    </Info>
  );
}

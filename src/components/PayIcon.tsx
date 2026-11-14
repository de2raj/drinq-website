/** Small brand-neutral badges for the payment options (placeholders until a gateway is chosen). */
const LABEL: Record<string, string> = { PAYNOW: "PayNow", CARD: "VISA·MC", APPLE_PAY: " Pay", GOOGLE_PAY: "G Pay", GRABPAY: "Grab" };
export function PayIcon({ id }: { id: string }) {
  return <span className={`payicon pi-${id.toLowerCase()}`} aria-hidden="true">{LABEL[id] ?? id}</span>;
}

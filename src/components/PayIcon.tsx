import { PayLogo } from "./BrandLogos";

/** Payment option logo (official brand marks), used at checkout, on orders, in admin and the footer. */
export function PayIcon({ id }: { id: string }) {
  return <PayLogo id={id} />;
}

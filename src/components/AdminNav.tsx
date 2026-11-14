import Link from "next/link";

const TABS = [
  ["dashboard", "Dashboard", "/admin"],
  ["orders", "Orders", "/admin/orders"],
  ["products", "Products", "/admin/products"],
  ["customers", "Customers", "/admin/customers"],
  ["settings", "Settings", "/admin/settings"],
] as const;
export type AdminTab = (typeof TABS)[number][0];

export function AdminNav({ active }: { active: AdminTab }) {
  return (
    <div className="anav">
      <h1 className="display">DRINQ admin</h1>
      <nav>
        {TABS.map(([k, label, href]) => <Link key={k} href={href} aria-current={active === k ? "page" : undefined}>{label}</Link>)}
        <Link href="/" className="shop">View shop ↗</Link>
      </nav>
    </div>
  );
}

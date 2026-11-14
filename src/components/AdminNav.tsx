import Link from "next/link";

export function AdminNav({ active }: { active: "orders" | "products" }) {
  return (
    <div className="anav">
      <h1 className="display">DRINQ admin</h1>
      <nav>
        <Link href="/admin" aria-current={active === "orders" ? "page" : undefined}>Orders</Link>
        <Link href="/admin/products" aria-current={active === "products" ? "page" : undefined}>Products</Link>
        <Link href="/" className="shop">View shop ↗</Link>
      </nav>
    </div>
  );
}

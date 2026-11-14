import type { Metadata } from "next";
import { AdminNav } from "@/components/AdminNav";
import { ProductForm } from "@/components/ProductForm";
import { CATEGORY_GROUPS } from "@/lib/admin-products";

export const metadata: Metadata = { title: "Add product · Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function NewProduct({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  const rt = String((await searchParams).returnTo ?? "");
  return (
    <div className="wrap admin">
      <AdminNav active="products" />
      <h2 className="display atitle">Add product</h2>
      <ProductForm
        returnTo={rt.startsWith("/admin/products") ? rt : "/admin/products"}
        groups={CATEGORY_GROUPS}
        init={{ name: "", brand: "", size: "", sku: "", price: "", was: "", categories: [], inStock: true, active: true, image: "" }}
      />
    </div>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminNav } from "@/components/AdminNav";
import { ProductForm } from "@/components/ProductForm";
import { CATEGORY_GROUPS } from "@/lib/admin-products";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Edit product · Admin", robots: { index: false } };
export const dynamic = "force-dynamic";
const dollars = (c: number) => (c / 100).toFixed(2);

export default async function EditProduct({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ returnTo?: string }> }) {
  const { id } = await params;
  const rt = String((await searchParams).returnTo ?? "");
  const p = await db.product.findUnique({ where: { id } });
  if (!p) notFound();
  return (
    <div className="wrap admin">
      <AdminNav active="products" />
      <h2 className="display atitle">Edit product</h2>
      <ProductForm
        returnTo={rt.startsWith("/admin/products") ? rt : "/admin/products"}
        groups={CATEGORY_GROUPS}
        init={{
          id: p.id, slug: p.slug, name: p.name, brand: p.brand, size: p.size, sku: p.sku,
          price: dollars(p.price), was: p.was > p.price ? dollars(p.was) : "",
          categories: p.categories ? p.categories.split("|") : [], inStock: p.inStock, active: p.active, image: p.image,
        }}
      />
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminNav } from "@/components/AdminNav";
import { OrderEditor } from "@/components/OrderEditor";
import { db } from "@/lib/db";
import { editorData } from "@/lib/editor-data";

export const metadata: Metadata = { title: "Edit order · Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function EditOrder({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const o = Number.isInteger(id) ? await db.order.findUnique({ where: { id }, include: { lines: true } }) : null;
  if (!o) notFound();
  const data = await editorData();
  // Keep the order's own option even if it has since been switched off.
  const methods = data.methods.some((m) => m.id === o.deliveryMethod) ? data.methods
    : [...data.methods, { id: o.deliveryMethod, name: o.deliveryLabel, fee: o.deliveryFee, freeFrom: 0, date: o.deliveryDate, slot: o.deliverySlot, slots: [] }];
  return (
    <div className="wrap admin">
      <AdminNav active="orders" />
      <div className="ohead"><div><Link className="u" href={`/admin/orders/${o.id}`}>← Back to order</Link><h2 className="display atitle">Edit {o.number}</h2></div></div>
      <OrderEditor products={data.products} methods={methods} payments={data.payments}
        initial={{
          id: o.id, name: o.name, email: o.email, phone: o.phone, address: o.address, unit: o.unit, postal: o.postal, notes: o.notes,
          method: o.deliveryMethod, date: o.deliveryDate, slot: o.deliverySlot, payment: o.paymentMethod, deliveryFee: o.deliveryFee, paid: false,
          lines: o.lines.map((l) => ({ productId: l.productId, name: l.name, qty: l.qty, unitPrice: l.unitPrice, thumb: data.thumbs.get(l.productId) ?? "" })),
        }} />
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { AdminNav } from "@/components/AdminNav";
import { OrderEditor } from "@/components/OrderEditor";
import { db } from "@/lib/db";
import { editorData } from "@/lib/editor-data";

export const metadata: Metadata = { title: "New order · Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Staff type in an order for a walk-in, phone or Telegram customer. */
export default async function NewOrder({ searchParams }: { searchParams: Promise<{ customer?: string }> }) {
  const email = String((await searchParams).customer ?? "").trim().toLowerCase();
  const [data, last] = await Promise.all([
    editorData(),
    email ? db.order.findFirst({ where: { email }, orderBy: { id: "desc" } }) : null,
  ]);
  const m = data.methods[0];
  return (
    <div className="wrap admin">
      <AdminNav active="orders" />
      <div className="ohead"><div><Link className="u" href="/admin/orders">← All orders</Link><h2 className="display atitle">New order</h2></div></div>
      <OrderEditor products={data.products} methods={data.methods} payments={data.payments}
        initial={last ? {
          name: last.name, email: last.email, phone: last.phone, address: last.address, unit: last.unit, postal: last.postal, notes: "",
          method: m.id, date: m.date, slot: m.slot, payment: data.payments[0]?.id ?? "", lines: [], deliveryFee: m.fee, paid: false,
        } : undefined} />
    </div>
  );
}

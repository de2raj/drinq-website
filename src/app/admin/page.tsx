import type { Metadata } from "next";
import { revalidatePath } from "next/cache";
import { AdminNav } from "@/components/AdminNav";
import { db } from "@/lib/db";
import { slotLabel } from "@/lib/delivery";
import { money } from "@/lib/money";

export const metadata: Metadata = { title: "Orders", robots: { index: false } };
export const dynamic = "force-dynamic";

async function setStatus(fd: FormData) {
  "use server";
  const id = Number(fd.get("id"));
  const status = String(fd.get("status"));
  if (!["PAID", "CANCELLED", "AWAITING_PAYMENT"].includes(status)) return;
  await db.order.update({ where: { id }, data: { status, paidAt: status === "PAID" ? new Date() : null } });
  revalidatePath("/admin");
}

/** Stop-gap order list until web orders flow into the Alcools ERP. */
export default async function Admin() {
  const orders = await db.order.findMany({ orderBy: { id: "desc" }, take: 200, include: { lines: true } });
  return (
    <div className="wrap admin">
      <AdminNav active="orders" />
      <div style={{ overflowX: "auto" }}>
        <table className="atable">
          <thead><tr><th>Order</th><th>Customer</th><th>Delivery</th><th>Items</th><th>Total</th><th>Status</th></tr></thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td><b>{o.number}</b><br />{o.createdAt.toLocaleString("en-SG", { timeZone: "Asia/Singapore" })}<br /><a className="u" href={`/order/${o.token}`} target="_blank">Customer page</a></td>
                <td>{o.name}<br />{o.phone}<br />{o.email}</td>
                <td>{slotLabel(o.deliveryDate, o.deliverySlot)}<br />{o.address}{o.unit ? `, ${o.unit}` : ""}, S{o.postal}{o.notes && <><br /><i>{o.notes}</i></>}</td>
                <td>{o.lines.map((l) => <div key={l.id}>{l.qty} × {l.name}</div>)}</td>
                <td><b>{money(o.total)}</b><br />{o.paymentMethod === "CARD" ? "Card" : "PayNow"}</td>
                <td>
                  <b>{o.status === "PAID" ? "Paid" : o.status === "CANCELLED" ? "Cancelled" : "Awaiting payment"}</b>
                  {o.status !== "PAID" && (
                    <form action={setStatus} style={{ marginTop: 8 }}><input type="hidden" name="id" value={o.id} /><input type="hidden" name="status" value="PAID" /><button className="btn btn-sm">Mark paid</button></form>
                  )}
                  {o.status === "AWAITING_PAYMENT" && (
                    <form action={setStatus} style={{ marginTop: 6 }}><input type="hidden" name="id" value={o.id} /><input type="hidden" name="status" value="CANCELLED" /><button className="btn btn-sm btn-line">Cancel</button></form>
                  )}
                </td>
              </tr>
            ))}
            {!orders.length && <tr><td colSpan={6}>No orders yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

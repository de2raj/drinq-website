"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { STATUS } from "@/lib/order-status";
import { setStatus } from "@/lib/orders";
import { saveStaffOrder, type StaffOrderInput, type StaffOrderResult } from "@/lib/staff-orders";

export async function changeStatus(fd: FormData) {
  const id = Number(fd.get("id"));
  const status = String(fd.get("status"));
  const note = String(fd.get("note") ?? "").trim().slice(0, 500);
  if (!id || !(status in STATUS)) return;
  await setStatus(id, status, note);
  revalidatePath("/admin", "layout");
}

export async function saveNote(fd: FormData) {
  const id = Number(fd.get("id"));
  if (!id) return;
  await db.order.update({ where: { id }, data: { adminNote: String(fd.get("adminNote") ?? "").slice(0, 2000) } });
  revalidatePath(`/admin/orders/${id}`);
}

export async function saveOrder(input: StaffOrderInput): Promise<StaffOrderResult> {
  const r = await saveStaffOrder(input);
  if (r.ok) revalidatePath("/admin", "layout");
  return r;
}

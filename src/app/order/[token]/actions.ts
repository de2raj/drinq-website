"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { setStatus } from "@/lib/orders";
import { getSetting } from "@/lib/settings";

/** Test mode only: pretend the customer paid, so the full order cycle can be tried. */
export async function simulatePayment(fd: FormData) {
  const token = String(fd.get("token") ?? "");
  const payments = await getSetting("payments");
  if (!payments.testMode || !/^[a-f0-9]{32}$/.test(token)) return;
  const o = await db.order.findUnique({ where: { token } });
  if (!o || o.status !== "AWAITING_PAYMENT") return;
  await setStatus(o.id, "PAID", "Test payment (simulated)");
  revalidatePath(`/order/${token}`);
}

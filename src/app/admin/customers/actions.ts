"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hashPassword, normEmail, normPhone } from "@/lib/customers";
import { db } from "@/lib/db";
import { adjustPoints } from "@/lib/loyalty";

const str = (fd: FormData, k: string, max = 200) => String(fd.get(k) ?? "").trim().slice(0, max);
const back = (id: number, msg: string) => { revalidatePath("/admin", "layout"); redirect(`/admin/customers/${id}?saved=${msg}`); };

export async function saveCustomer(fd: FormData) {
  const id = Number(fd.get("id"));
  if (!id) return;
  const email = normEmail(str(fd, "email"));
  const taken = email ? await db.customer.findFirst({ where: { email, id: { not: id } }, select: { id: true } }) : null;
  if (taken) redirect(`/admin/customers/${id}?error=email`);
  await db.customer.update({
    where: { id },
    data: {
      name: str(fd, "name", 100), email: email || null, phone: normPhone(str(fd, "phone", 30)),
      address: str(fd, "address"), unit: str(fd, "unit", 40), postal: str(fd, "postal", 10),
      birthday: /^\d{4}-\d{2}-\d{2}$/.test(str(fd, "birthday", 10)) ? str(fd, "birthday", 10) : "",
      tags: str(fd, "tags", 300).split(",").map((t) => t.trim()).filter(Boolean).join("|"),
      marketing: fd.get("marketing") === "on",
      notes: String(fd.get("notes") ?? "").slice(0, 5000),
    },
  });
  back(id, "details");
}

export async function changePoints(fd: FormData) {
  const id = Number(fd.get("id"));
  const n = Math.trunc(Number(fd.get("points")));
  if (!id || !n || Math.abs(n) > 100000) return;
  await adjustPoints(id, fd.get("dir") === "remove" ? -Math.abs(n) : Math.abs(n), str(fd, "reason", 150));
  back(id, "points");
}

export async function setPassword(fd: FormData) {
  const id = Number(fd.get("id"));
  const pw = String(fd.get("password") ?? "");
  if (!id || pw.length < 8) redirect(`/admin/customers/${id}?error=password`);
  await db.customer.update({ where: { id }, data: { passwordHash: await hashPassword(pw) } });
  back(id, "password");
}

"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { checkPassword, currentCustomer, hashPassword, normEmail, normPhone, signIn, signOut } from "@/lib/customers";
import { db } from "@/lib/db";

export type FormState = { error?: string; ok?: string; values?: Record<string, string> };
const str = (fd: FormData, k: string, max = 200) => String(fd.get(k) ?? "").trim().slice(0, max);
/** Only go back to a page on this site. */
const safeNext = (v: string) => (v.startsWith("/") && !v.startsWith("//") ? v : "/account");

export async function register(_: FormState, fd: FormData): Promise<FormState> {
  const values = { name: str(fd, "name", 100), email: normEmail(str(fd, "email")), phone: normPhone(str(fd, "phone", 30)) };
  const password = String(fd.get("password") ?? "");
  const fail = (error: string) => ({ error, values });
  if (!values.name) return fail("Please enter your name.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) return fail("Please enter a valid email.");
  if (!/^[3689]\d{7}$/.test(values.phone)) return fail("Please enter a Singapore mobile number (8 digits).");
  if (password.length < 8) return fail("Your password needs at least 8 characters.");

  const found = await db.customer.findUnique({ where: { email: values.email }, include: { _count: { select: { orders: true } } } });
  if (found?.passwordHash) return fail("There's already an account with this email. Please sign in instead.");
  // Someone who already ordered as a guest claims their points with the mobile number they ordered with.
  if (found && found._count.orders && normPhone(found.phone) !== values.phone) {
    return fail("This email already has orders with us. Please enter the mobile number you used for them, so we can move your points across.");
  }
  const passwordHash = await hashPassword(password);
  const data = { name: values.name, phone: values.phone, passwordHash, marketing: fd.get("marketing") === "on" };
  const c = found ? await db.customer.update({ where: { id: found.id }, data }) : await db.customer.create({ data: { ...data, email: values.email } });
  await signIn(c.id, passwordHash);
  redirect(safeNext(str(fd, "next")));
}

export async function login(_: FormState, fd: FormData): Promise<FormState> {
  const email = normEmail(str(fd, "email"));
  const c = email ? await db.customer.findUnique({ where: { email } }) : null;
  if (!c?.passwordHash || !(await checkPassword(String(fd.get("password") ?? ""), c.passwordHash))) {
    return { error: "That email and password don't match. Please try again.", values: { email } };
  }
  await signIn(c.id, c.passwordHash);
  redirect(safeNext(str(fd, "next")));
}

export async function logout() {
  await signOut();
  redirect("/");
}

export async function saveDetails(_: FormState, fd: FormData): Promise<FormState> {
  const me = await currentCustomer();
  if (!me) redirect("/account/login");
  const values = {
    name: str(fd, "name", 100), phone: normPhone(str(fd, "phone", 30)), address: str(fd, "address"), unit: str(fd, "unit", 40),
    postal: str(fd, "postal", 10), birthday: /^\d{4}-\d{2}-\d{2}$/.test(str(fd, "birthday", 10)) ? str(fd, "birthday", 10) : "",
  };
  if (!values.name) return { error: "Please enter your name.", values };
  if (values.postal && !/^\d{6}$/.test(values.postal)) return { error: "Singapore postal codes have 6 digits.", values };
  await db.customer.update({ where: { id: me.id }, data: { ...values, marketing: fd.get("marketing") === "on" } });
  revalidatePath("/account");
  return { ok: "Saved.", values };
}

export async function changePassword(_: FormState, fd: FormData): Promise<FormState> {
  const me = await currentCustomer();
  if (!me) redirect("/account/login");
  if (!(await checkPassword(String(fd.get("current") ?? ""), me.passwordHash))) return { error: "Your current password isn't right." };
  const next = String(fd.get("password") ?? "");
  if (next.length < 8) return { error: "Your new password needs at least 8 characters." };
  const passwordHash = await hashPassword(next);
  await db.customer.update({ where: { id: me.id }, data: { passwordHash } });
  await signIn(me.id, passwordHash);
  return { ok: "Password changed." };
}

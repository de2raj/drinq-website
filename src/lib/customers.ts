import "server-only";
import { createHmac, randomBytes, scrypt as _scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { db } from "./db";

const scrypt = promisify(_scrypt) as (pw: string, salt: string, len: number) => Promise<Buffer>;
export const COOKIE = "dq_member";
const MAX_AGE = 60 * 60 * 24 * 60; // 60 days

export const normEmail = (s: string) => s.trim().toLowerCase().slice(0, 150);
export const normPhone = (s: string) => s.replace(/[\s-]/g, "").replace(/^\+?65(?=\d{8}$)/, "").slice(0, 30);

export async function hashPassword(pw: string) {
  const salt = randomBytes(16).toString("hex");
  return `s1$${salt}$${(await scrypt(pw, salt, 32)).toString("hex")}`;
}
export async function checkPassword(pw: string, stored: string) {
  const [v, salt, hash] = stored.split("$");
  if (v !== "s1" || !salt || !hash) return false;
  const got = await scrypt(pw, salt, 32);
  const want = Buffer.from(hash, "hex");
  return want.length === got.length && timingSafeEqual(got, want);
}

/** A secret kept in the database (made on first use), so no extra hosting setting is needed. */
let secret: string | null = null;
async function getSecret() {
  if (secret) return secret;
  const row = await db.setting.findUnique({ where: { key: "memberSecret" } });
  if (row) return (secret = JSON.parse(row.value) as string);
  const s = randomBytes(32).toString("hex");
  await db.setting.upsert({ where: { key: "memberSecret" }, create: { key: "memberSecret", value: JSON.stringify(s) }, update: {} });
  const again = await db.setting.findUnique({ where: { key: "memberSecret" } });
  return (secret = JSON.parse(again!.value) as string);
}
// The password hash is part of the signature, so changing the password signs out everywhere.
const sign = async (id: number, at: number, pwHash: string) =>
  createHmac("sha256", await getSecret()).update(`${id}.${at}.${pwHash.slice(-16)}`).digest("base64url");

export async function signIn(id: number, pwHash: string) {
  const at = Math.floor(Date.now() / 1000);
  (await cookies()).set(COOKIE, `${id}.${at}.${await sign(id, at, pwHash)}`, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: MAX_AGE,
  });
}
export async function signOut() {
  (await cookies()).delete(COOKIE);
}

/** The signed-in customer, or null. */
export async function currentCustomer() {
  const raw = (await cookies()).get(COOKIE)?.value;
  const m = raw?.match(/^(\d+)\.(\d+)\.([\w-]+)$/);
  if (!m) return null;
  const id = Number(m[1]), at = Number(m[2]);
  if (Date.now() / 1000 - at > MAX_AGE) return null;
  const c = await db.customer.findUnique({ where: { id } });
  if (!c?.passwordHash) return null;
  const want = await sign(id, at, c.passwordHash);
  const got = m[3];
  if (want.length !== got.length || !timingSafeEqual(Buffer.from(want), Buffer.from(got))) return null;
  return c;
}

/**
 * The customer record for an order: by email, else by phone (walk-ins without email).
 * Creates a guest record the first time; fills in details that were blank.
 */
export async function customerFor(d: { email: string; phone: string; name: string; address?: string; unit?: string; postal?: string }) {
  const email = d.email ? normEmail(d.email) : "";
  const phone = normPhone(d.phone);
  const found = email
    ? await db.customer.findUnique({ where: { email } })
    : phone ? await db.customer.findFirst({ where: { phone, email: null } }) : null;
  const fill = { name: d.name, phone, address: d.address ?? "", unit: d.unit ?? "", postal: d.postal ?? "" };
  if (found) {
    const patch: Record<string, string> = {};
    for (const [k, v] of Object.entries(fill)) if (v && !found[k as keyof typeof fill]) patch[k] = v;
    if (Object.keys(patch).length) await db.customer.update({ where: { id: found.id }, data: patch });
    return found.id;
  }
  if (!email && !phone) return null;
  const c = await db.customer.create({ data: { ...fill, email: email || null } });
  return c.id;
}

/** Links orders placed before customer records existed (runs on start; cheap once done). */
export async function linkOldOrders() {
  const orders = await db.order.findMany({ where: { customerId: null }, orderBy: { id: "asc" }, select: { id: true, email: true, phone: true, name: true, address: true, unit: true, postal: true } });
  for (const o of orders) {
    const id = await customerFor(o);
    if (id) await db.order.update({ where: { id: o.id }, data: { customerId: id } });
  }
  return orders.length;
}

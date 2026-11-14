/**
 * Public status check for GoDaddy's health monitor. Reveals no values:
 * only whether each DRINQ setting is present, to diagnose hosting setup.
 */
export const dynamic = "force-dynamic";

const KEYS = ["STAGING_PASSWORD", "ADMIN_PASSWORD", "SITE_URL", "PAYNOW_UEN", "PAYNOW_NAME", "NEXT_PUBLIC_TELEGRAM_URL", "DB_HOST", "DATABASE_URL", "STRIPE_SECRET_KEY"];

export function GET() {
  const present = Object.fromEntries(KEYS.map((k) => [k, !!process.env[k]]));
  return Response.json({ ok: true, settings: present, envCount: Object.keys(process.env).length });
}

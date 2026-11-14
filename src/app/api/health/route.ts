/** Public status check for GoDaddy's health monitor (Settings → General → path /api/health). Reveals nothing. */
export const dynamic = "force-dynamic";
export function GET() {
  return Response.json({ ok: true });
}

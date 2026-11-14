import { NextResponse, type NextRequest } from "next/server";

/**
 * Sign-in gates (browser password box):
 *  - /admin: user "admin", password ADMIN_PASSWORD. No password set = admin is off.
 *  - Whole site while STAGING_PASSWORD is set (test site): user "drinq", or the admin login.
 * Stripe's webhook is never gated.
 */
function creds(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  if (!auth.startsWith("Basic ")) return null;
  try {
    const raw = atob(auth.slice(6));
    const i = raw.indexOf(":");
    return { user: raw.slice(0, i), pw: raw.slice(i + 1) };
  } catch {
    return null;
  }
}

const ask = (realm: string, msg = "Sign in required") =>
  new NextResponse(msg, { status: 401, headers: { "WWW-Authenticate": `Basic realm="${realm}", charset="UTF-8"` } });

export function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  if (path.startsWith("/api/stripe/webhook") || path === "/api/health") return NextResponse.next();

  const c = creds(req);
  const admin = process.env.ADMIN_PASSWORD;
  const isAdmin = !!admin && c?.user === "admin" && c.pw === admin;

  if (path.startsWith("/admin")) {
    if (!admin) return new NextResponse("Admin is turned off", { status: 401 });
    return isAdmin ? NextResponse.next() : ask("DRINQ admin");
  }

  const staging = process.env.STAGING_PASSWORD;
  if (staging && !isAdmin && !(c?.user === "drinq" && c.pw === staging)) return ask("DRINQ test site");
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };

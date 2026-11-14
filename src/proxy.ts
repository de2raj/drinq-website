import { NextResponse, type NextRequest } from "next/server";
import { comingSoonPage, isComingSoon } from "@/lib/coming-soon";
import { SHOP } from "@/lib/config";
import { loginPage, TEST_COOKIE, testToken } from "@/lib/test-site";

/**
 * Locks:
 *  - /admin: browser sign-in box, user "admin", password ADMIN_PASSWORD. No password set = admin is off.
 *  - Whole site while STAGING_PASSWORD is set (test site): a password page (status 200, so hosting
 *    health checks pass) that sets a cookie. The admin login also gets in.
 * Never locked: Stripe's webhook, /api/health, the password form itself and the logo it shows.
 */
const OPEN = ["/api/stripe/webhook", "/api/health", "/api/test-site-login", "/drinq-logo-black.png", "/drinq-logo-yellow.png"];

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

export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  if (OPEN.some((p) => path === p || path.startsWith(p + "/"))) return NextResponse.next();

  // drinq.sg / www.drinq.sg before launch: the "Coming soon" page only.
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
  if (isComingSoon(host)) {
    return new NextResponse(comingSoonPage(SHOP.telegramUrl), {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=300" },
    });
  }

  const c = creds(req);
  const admin = process.env.ADMIN_PASSWORD;
  const isAdmin = !!admin && c?.user === "admin" && c.pw === admin;

  if (path.startsWith("/admin")) {
    if (!admin) return new NextResponse("Admin is turned off", { status: 401 });
    if (isAdmin) return NextResponse.next();
    return new NextResponse("Sign in required", { status: 401, headers: { "WWW-Authenticate": 'Basic realm="DRINQ admin", charset="UTF-8"' } });
  }

  const staging = process.env.STAGING_PASSWORD;
  if (!staging || isAdmin) return NextResponse.next();
  if (req.cookies.get(TEST_COOKIE)?.value === (await testToken(staging.trim()))) return NextResponse.next();

  if (req.method !== "GET" && req.method !== "HEAD") return new NextResponse("Test site: sign in first", { status: 401 });
  const wrong = req.nextUrl.searchParams.get("testpw") === "wrong";
  const next = req.nextUrl.pathname + req.nextUrl.search.replace(/[?&]testpw=wrong/, "").replace(/^&/, "?");
  return new NextResponse(loginPage(next, wrong), {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" },
  });
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };

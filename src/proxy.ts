import { NextResponse, type NextRequest } from "next/server";

/** Password-protects /admin (user "admin", password ADMIN_PASSWORD). No password set = admin is off. */
export function proxy(req: NextRequest) {
  const pass = process.env.ADMIN_PASSWORD;
  const auth = req.headers.get("authorization") ?? "";
  if (pass && auth.startsWith("Basic ")) {
    const [user, pw] = atob(auth.slice(6)).split(":");
    if (user === "admin" && pw === pass) return NextResponse.next();
  }
  return new NextResponse(pass ? "Sign in required" : "Admin is turned off", {
    status: 401,
    headers: pass ? { "WWW-Authenticate": 'Basic realm="DRINQ admin"' } : {},
  });
}
export const config = { matcher: ["/admin/:path*"] };

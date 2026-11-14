import { safeNext, TEST_COOKIE, testToken } from "@/lib/test-site";

/** Test-site password form → sets the access cookie and goes back to the page the tester wanted. */
export async function POST(req: Request) {
  const pass = process.env.STAGING_PASSWORD;
  const form = await req.formData();
  const next = safeNext(form.get("next"));
  const given = String(form.get("password") ?? "");
  const url = new URL(req.url);
  const base = `${req.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "")}://${req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? url.host}`;

  if (!pass || given !== pass) {
    await new Promise((r) => setTimeout(r, 600)); // slow down guessing
    const back = new URL(next, base);
    back.searchParams.set("testpw", "wrong");
    return Response.redirect(back, 303);
  }
  const res = new Response(null, { status: 303, headers: { Location: new URL(next, base).toString() } });
  const secure = base.startsWith("https") ? "; Secure" : "";
  res.headers.append("Set-Cookie", `${TEST_COOKIE}=${await testToken(pass)}; Path=/; Max-Age=2592000; HttpOnly; SameSite=Lax${secure}`);
  return res;
}

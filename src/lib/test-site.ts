/** Test-site lock (STAGING_PASSWORD): a password page + cookie, so health checks still see a normal 200 page. */
export const TEST_COOKIE = "drinq_test";

export async function testToken(password: string) {
  const data = new TextEncoder().encode(`drinq-test-site:${password}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Only same-site paths, never "//other.site". */
export const safeNext = (n: unknown) => {
  const s = typeof n === "string" ? n : "/";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/";
};

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export function loginPage(next: string, wrong: boolean) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>DRINQ — test site</title>
<style>
*{box-sizing:border-box;margin:0}body{font-family:system-ui,-apple-system,Segoe UI,sans-serif;background:#FFC515;color:#231F20;min-height:100vh;display:grid;place-items:center;padding:24px}
.box{width:min(380px,100%);text-align:center}img{height:44px;margin:0 auto 26px;display:block}
h1{font-weight:900;text-transform:uppercase;font-size:28px;letter-spacing:-.01em;margin-bottom:8px}p{font-weight:500;margin-bottom:22px;line-height:1.45}
input{width:100%;height:52px;border:2px solid #231F20;border-radius:14px;padding:0 16px;font-size:16px;background:#fff;outline:0;margin-bottom:12px}
input:focus{box-shadow:0 0 0 3px #fff}button{width:100%;height:52px;border:2px solid #231F20;border-radius:999px;background:#231F20;color:#FFC515;font-weight:800;font-size:16px;cursor:pointer}
.err{background:#fff;border:2px solid #D7261E;color:#D7261E;border-radius:12px;padding:10px;font-weight:700;margin-bottom:12px}
small{display:block;margin-top:18px;font-weight:600;font-size:12px}
</style></head><body><form class="box" method="post" action="/api/test-site-login">
<img src="/drinq-logo-black.png" alt="DRINQ"><h1>Test site</h1><p>This is DRINQ's private test site. Enter the tester password to continue.</p>
${wrong ? '<div class="err">That password isn\'t right. Please try again.</div>' : ""}
<input type="password" name="password" placeholder="Tester password" autocomplete="current-password" required autofocus>
<input type="hidden" name="next" value="${esc(next)}">
<button type="submit">Enter</button><small>Orders placed here are not real.</small></form></body></html>`;
}

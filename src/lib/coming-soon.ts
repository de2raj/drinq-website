/**
 * Until launch, the public addresses (drinq.sg, www.drinq.sg) show a "Coming soon" page,
 * while staging.drinq.sg keeps the (password-locked) shop.
 * Launch day: set LAUNCHED=1 in the hosting settings (and remove STAGING_PASSWORD).
 */
export const COMING_SOON_HOSTS = (process.env.COMING_SOON_HOSTS || "drinq.sg,www.drinq.sg")
  .split(",").map((h) => h.trim().toLowerCase()).filter(Boolean);

export const isComingSoon = (host: string) =>
  process.env.LAUNCHED !== "1" && COMING_SOON_HOSTS.includes(host.toLowerCase().replace(/:\d+$/, ""));

export function comingSoonPage(telegramUrl: string) {
  return `<!doctype html><html lang="en-SG"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>DRINQ — Coming soon</title><meta name="description" content="DRINQ: drinks delivered across Singapore. Our online shop is coming soon — order on Telegram today.">
<meta name="theme-color" content="#FFC515">
<style>
*{box-sizing:border-box;margin:0}body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#FFC515;color:#231F20;min-height:100vh;display:flex;flex-direction:column}
main{flex:1;display:grid;place-items:center;padding:32px 20px;text-align:center}.box{width:min(560px,100%)}
img{height:56px;width:auto;margin:0 auto 34px;display:block}
.tag{display:inline-block;background:#231F20;color:#FFC515;font-weight:800;font-size:13px;letter-spacing:.06em;text-transform:uppercase;padding:7px 14px;border-radius:999px;margin-bottom:18px}
h1{font-weight:900;text-transform:uppercase;letter-spacing:-.02em;line-height:.95;font-size:clamp(44px,11vw,84px);margin-bottom:18px}
p{font-size:18px;font-weight:500;line-height:1.5;margin:0 auto 28px;max-width:34ch}
a.btn{display:inline-flex;align-items:center;gap:10px;height:56px;padding:0 28px;border-radius:999px;background:#231F20;color:#FFC515;font-weight:800;font-size:17px;text-decoration:none;border:2px solid #231F20}
a.btn:hover{transform:translateY(-2px)}a.btn svg{flex:none}
footer{background:#141213;color:#fff;text-align:center;font-size:13px;line-height:1.6;padding:16px 20px}
</style></head><body><main><div class="box">
<img src="/drinq-logo-black.png" alt="DRINQ">
<span class="tag">Coming soon</span>
<h1>Drinks to your door.</h1>
<p>Our online shop is almost ready. Spirits, wine, beer and mixers delivered across Singapore.</p>
<a class="btn" href="${telegramUrl}" target="_blank" rel="noopener"><svg width="22" height="22" viewBox="0 0 24 24" fill="#FFC515" aria-hidden="true"><path d="M21.6 3.3 2.9 10.5c-1.3.5-1.3 1.2-.2 1.6l4.8 1.5 1.8 5.6c.2.6.1.9.8.9.5 0 .7-.2 1-.5l2.4-2.3 4.9 3.6c.9.5 1.6.2 1.8-.8l3.2-15.2c.3-1.3-.5-1.9-1.6-1.4zM8.4 13.2l9.9-6.2c.5-.3.9-.1.6.2l-8.5 7.7-.3 3.5z"/></svg>Order now on Telegram</a>
</div></main>
<footer>© ${new Date().getFullYear()} DRINQSG PTE LTD · 18+ only · Please drink responsibly</footer></body></html>`;
}

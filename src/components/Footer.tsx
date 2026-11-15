import Link from "next/link";
import { SHOP } from "@/lib/config";
import { money } from "@/lib/money";
import { getSetting } from "@/lib/settings";
import { PayIcon } from "./PayIcon";

const ICON = {
  telegram: <path d="M21.5 4.3 2.9 11.5c-1.3.5-1.3 1.2-.2 1.6l4.8 1.5 1.8 5.6c.2.6.1.9.8.9.5 0 .7-.2 1-.5l2.3-2.2 4.8 3.5c.9.5 1.5.2 1.7-.8l3.1-14.7c.3-1.3-.5-1.9-1.5-1.1ZM8.6 14.4l9.6-6.1c.5-.3.9-.1.5.2l-8.2 7.4-.3 3.4-1.6-4.9Z" />,
  facebook: <path d="M14 8.5V6.6c0-.8.2-1.3 1.4-1.3H17V2.2C16.7 2.1 15.7 2 14.6 2 12.2 2 10.6 3.4 10.6 6.1v2.4H8v3.5h2.6V22H14V12h2.7l.4-3.5H14Z" />,
  instagram: <path d="M12 7.3a4.7 4.7 0 1 0 0 9.4 4.7 4.7 0 0 0 0-9.4Zm0 7.7a3 3 0 1 1 0-6 3 3 0 0 1 0 6Zm6-7.9a1.1 1.1 0 1 1-2.2 0 1.1 1.1 0 0 1 2.2 0ZM21.9 8.2c-.1-1.6-.4-3-1.6-4.2S17.4 2.2 15.8 2.1C14.2 2 9.8 2 8.2 2.1 6.6 2.2 5.2 2.5 4 3.7S2.2 6.6 2.1 8.2C2 9.8 2 14.2 2.1 15.8c.1 1.6.4 3 1.6 4.2s2.6 1.5 4.2 1.6c1.6.1 6 .1 7.6 0 1.6-.1 3-.4 4.2-1.6s1.5-2.6 1.6-4.2c.1-1.6.1-6 0-7.6Zm-2 9.4a3 3 0 0 1-1.7 1.7c-1.2.5-4 .4-5.2.4s-4.1.1-5.2-.4a3 3 0 0 1-1.7-1.7c-.5-1.2-.4-4-.4-5.2s-.1-4.1.4-5.2A3 3 0 0 1 7.8 4.7c1.2-.5 4-.4 5.2-.4s4.1-.1 5.2.4a3 3 0 0 1 1.7 1.7c.5 1.2.4 4 .4 5.2s.1 4.1-.4 5.2Z" />,
  tiktok: <path d="M16.6 2h-3.3v13.4a2.9 2.9 0 1 1-2.9-2.9c.3 0 .6 0 .9.1V9.2a6.2 6.2 0 1 0 5.3 6.2V8.6a7.9 7.9 0 0 0 4.4 1.3V6.6a4.5 4.5 0 0 1-4.4-4.6Z" />,
};

/** Site footer: payment strip, DRINQ Rewards sign-up, links, social, back to top. */
export async function Footer({ member }: { member: { first: string; points: number } | null }) {
  const [store, payments, loyalty] = await Promise.all([getSetting("store"), getSetting("payments"), getSetting("loyalty")]);
  const social = [
    ["telegram", "Telegram", SHOP.telegramUrl],
    ["facebook", "Facebook", store.social.facebook],
    ["instagram", "Instagram", store.social.instagram],
    ["tiktok", "TikTok", store.social.tiktok],
  ].filter(([, , url]) => url) as [keyof typeof ICON, string, string][];

  return (
    <footer className="ft" id="footer">
      <div className="fpay">
        <div className="wrap">
          <span className="fl">We accept</span>
          <span className="icons">{payments.options.filter((p) => p.enabled).map((p) => <PayIcon key={p.id} id={p.id} />)}</span>
          <span className="secure">🔒 Secure checkout</span>
        </div>
      </div>
      <div className="wrap">
        <div className="cols">
          {loyalty.enabled ? (
            <div className="join">
              <h4>DRINQ Rewards</h4>
              {member ? (
                <>
                  <p className="big">Hi {member.first}, you have <b>{member.points} points</b>.</p>
                  <p>That&apos;s {money(Math.floor(member.points / loyalty.block) * loyalty.blockValue)} off. Use them at checkout.</p>
                  <Link className="btn btn-yellow btn-sm" href="/account">My account →</Link>
                </>
              ) : (
                <>
                  <p className="big">Join free. Earn on every order.</p>
                  <ul className="perks2">
                    <li>{loyalty.earnPerDollar} point{loyalty.earnPerDollar === 1 ? "" : "s"} for every $1 you spend</li>
                    <li>Every {loyalty.block} points = {money(loyalty.blockValue)} off</li>
                    <li>Saved details for faster checkout</li>
                    <li>First to hear about deals</li>
                  </ul>
                  <form className="fjoin" action="/account/register" method="get">
                    <input type="email" name="email" placeholder="Your email address" aria-label="Your email address" required />
                    <button className="btn btn-yellow btn-sm">Join now</button>
                  </form>
                </>
              )}
            </div>
          ) : <div />}
          <div>
            <h4>Shop with us</h4>
            <ul>
              <li><Link href="/rewards">DRINQ Rewards</Link></li>
              <li><Link href="/delivery">How delivery works</Link></li>
              <li><Link href="/delivery#collect">Self-collection</Link></li>
              <li><Link href="/deals">This week&apos;s deals</Link></li>
              <li><Link href={member ? "/account" : "/account/login"}>{member ? "My account" : "Sign in"}</Link></li>
            </ul>
          </div>
          <div>
            <h4>Help</h4>
            <ul>
              <li><Link href="/contact">Contact us</Link></li>
              <li><Link href="/faq">FAQs</Link></li>
              <li><a href={SHOP.telegramUrl} target="_blank" rel="noopener">Chat on Telegram</a></li>
              <li><Link href="/terms">Terms &amp; conditions</Link></li>
              <li><Link href="/privacy">Privacy policy</Link></li>
            </ul>
          </div>
          <div>
            <h4>Follow us</h4>
            <div className="social">
              {social.map(([k, label, url]) => (
                <a key={k} href={url} target="_blank" rel="noopener" aria-label={label} title={label}>
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">{ICON[k]}</svg>
                </a>
              ))}
            </div>
          </div>
        </div>
        <p className="freenote">{store.freeNote}</p>
        <div className="fine">
          <img src="/drinq-logo-yellow.png" alt="DRINQ" className="flogo" />
          <span>© {new Date().getFullYear()} {SHOP.company} · UEN {SHOP.uen} · Prices in SGD</span>
          <span className="sp" />
          <span>18+ only. Please drink responsibly. No liquor sales 10.30pm – 7am.</span>
          <a href="#" className="totop" aria-label="Back to top">↑</a>
        </div>
      </div>
    </footer>
  );
}

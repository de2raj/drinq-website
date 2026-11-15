import Link from "next/link";
import { SHOP } from "@/lib/config";
import { money } from "@/lib/money";
import { getSetting } from "@/lib/settings";
import { SocialLogo, type SocialId } from "./BrandLogos";
import { PayIcon } from "./PayIcon";

/** Site footer: payment strip, DRINQ Rewards sign-up, links, social, back to top. */
export async function Footer({ member }: { member: { first: string; points: number } | null }) {
  const [store, payments, loyalty] = await Promise.all([getSetting("store"), getSetting("payments"), getSetting("loyalty")]);
  const social = [
    ["telegram", "Telegram", SHOP.telegramUrl],
    ["facebook", "Facebook", store.social.facebook],
    ["instagram", "Instagram", store.social.instagram],
    ["tiktok", "TikTok", store.social.tiktok],
  ].filter(([, , url]) => url) as [SocialId, string, string][];

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
                  <SocialLogo id={k} />
                </a>
              ))}
            </div>
          </div>
        </div>
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

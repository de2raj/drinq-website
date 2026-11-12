import Link from "next/link";
import { SHOP } from "@/lib/config";
import { SECTIONS } from "@/lib/sections";

export function Footer() {
  return (
    <footer className="ft">
      <div className="wrap">
        <div className="cols">
          <div>
            <img src="/drinq-logo-yellow.png" alt="DRINQ" style={{ height: 30, width: "auto", marginBottom: 16 }} />
            <p style={{ lineHeight: 1.6, maxWidth: "34ch" }}>Drinks delivered across Singapore. Spirits, wine, beer and mixers at honest prices.</p>
            <div className="paybadges"><span>PayNow</span><span>Visa</span><span>Mastercard</span><span>Apple Pay</span><span>Google Pay</span></div>
          </div>
          <div><h4>Shop</h4><ul>{SECTIONS.map((s) => <li key={s.slug}><Link href={`/${s.slug}`}>{s.name}</Link></li>)}</ul></div>
          <div><h4>Help</h4><ul><li><Link href="/delivery">Delivery</Link></li><li><Link href="/faq">FAQ</Link></li><li><Link href="/contact">Contact us</Link></li><li><Link href="/terms">Terms</Link></li><li><Link href="/privacy">Privacy</Link></li></ul></div>
          <div><h4>Follow</h4><ul><li><a href={SHOP.telegramUrl} target="_blank" rel="noopener">Telegram</a></li></ul></div>
        </div>
        <div className="fine">
          <span>© {new Date().getFullYear()} {SHOP.company} · UEN {SHOP.uen} · Prices in SGD</span>
          <span>18+ only. Please drink responsibly. No liquor sales 10.30pm – 7am.</span>
        </div>
      </div>
    </footer>
  );
}

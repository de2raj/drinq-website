import type { Metadata, Viewport } from "next";
import { Inter, Montserrat } from "next/font/google";
import { cookies } from "next/headers";
import { AgeGate } from "@/components/AgeGate";
import { CartProvider } from "@/components/CartProvider";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { menu } from "@/lib/catalogue";
import { freeGoals } from "@/lib/delivery";
import { getSetting } from "@/lib/settings";
import "./globals.css";

const display = Montserrat({ subsets: ["latin"], weight: ["700", "800", "900"], variable: "--font-display" });
const body = Inter({ subsets: ["latin"], variable: "--font-body" });

export const generateMetadata = (): Metadata => ({
  metadataBase: new URL(process.env.SITE_URL || "https://drinq.sg"),
  title: { default: "DRINQ — Drinks delivered across Singapore", template: "%s | DRINQ" },
  description: "Spirits, wine, beer and mixers delivered across Singapore. Same-day and next-day delivery, free from $200.",
  // Test site: keep it out of Google.
  ...(process.env.STAGING_PASSWORD ? { robots: { index: false, follow: false } } : {}),
});
export const viewport: Viewport = { themeColor: "#FFC515", width: "device-width", initialScale: 1 };

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const verified = (await cookies()).get("drinq_age")?.value === "1";
  const [store, delivery] = await Promise.all([getSetting("store"), getSetting("delivery")]);
  // Free-delivery goals: next day always; same day only while it really is same-day.
  const tiers = freeGoals(delivery);
  return (
    <html lang="en-SG" className={`${display.variable} ${body.variable}`}>
      <body>
        <CartProvider tiers={tiers}>
          {!!process.env.STAGING_PASSWORD && <div className="testbar">TEST SITE · orders here are not real · please don&apos;t pay</div>}
          <AgeGate verified={verified} />
          <Header menu={await menu()} announcement={store.announcement} />
          <main>{children}</main>
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}

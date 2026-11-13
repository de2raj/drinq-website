import type { Metadata, Viewport } from "next";
import { Inter, Montserrat } from "next/font/google";
import { cookies } from "next/headers";
import { AgeGate } from "@/components/AgeGate";
import { CartProvider } from "@/components/CartProvider";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { menu } from "@/lib/catalogue";
import "./globals.css";

const display = Montserrat({ subsets: ["latin"], weight: ["700", "800", "900"], variable: "--font-display" });
const body = Inter({ subsets: ["latin"], variable: "--font-body" });

export const generateMetadata = (): Metadata => ({
  metadataBase: new URL(process.env.SITE_URL || "https://drinq.sg"),
  title: { default: "DRINQ — Drinks delivered across Singapore", template: "%s | DRINQ" },
  description: "Spirits, wine, beer and mixers delivered across Singapore. Same-day delivery, free over $80.",
  // Test site: keep it out of Google.
  ...(process.env.STAGING_PASSWORD ? { robots: { index: false, follow: false } } : {}),
});
export const viewport: Viewport = { themeColor: "#FFC515", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const verified = (await cookies()).get("drinq_age")?.value === "1";
  return (
    <html lang="en-SG" className={`${display.variable} ${body.variable}`}>
      <body>
        <CartProvider>
          {!!process.env.STAGING_PASSWORD && <div className="testbar">TEST SITE · orders here are not real · please don&apos;t pay</div>}
          <AgeGate verified={verified} />
          <Header menu={menu()} />
          <main>{children}</main>
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}

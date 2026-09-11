import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

// next/font self-hosts the font at build time (downloaded once, served from
// this app's own origin) — no runtime request to Google's CDN, satisfying
// the "no runtime Google Fonts request" requirement without an extra
// Fontsource dependency.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kios-ERP",
  description: "Sistem kasir dan inventory toko sembako",
};

// Locked to 1x on Android/tablet (no pinch-zoom-out): this is a kiosk-style
// POS UI, not a document a customer reads at their own zoom level — a
// cashier accidentally zooming out mid-transaction is the actual bug this
// prevents, not a feature being removed from them.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

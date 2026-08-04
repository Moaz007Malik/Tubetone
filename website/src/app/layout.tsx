import type { Metadata } from "next";
import { Geist, Inter, IBM_Plex_Mono } from "next/font/google";
import { GradientBg } from "@/components/GradientBg";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

/**
 * Helixa-style SaaS type (Dribbble Helixa AI chatbot landings / helexa.webflow):
 * Geist for display + Inter for UI — free Google Fonts, commercial-safe.
 */
const display = Geist({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const logo = Geist({
  subsets: ["latin"],
  variable: "--font-logo",
  weight: ["600", "700"],
  display: "swap",
});

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "YTMP — Local media toolkit for Windows",
    template: "%s · YTMP",
  },
  description:
    "Download from the web, convert and edit media locally. Windows app with license activation — files stay on your PC.",
  icons: {
    icon: [
      { url: "/music-logo.png", type: "image/png" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${logo.variable} ${display.variable} ${sans.variable} ${mono.variable}`}
    >
      <body>
        <GradientBg intensity="hero" />
        <div className="site-shell">
          <SiteHeader />
          <div className="site-main">{children}</div>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}

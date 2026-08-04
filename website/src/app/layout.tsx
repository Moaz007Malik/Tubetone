import type { Metadata } from "next";
import { IBM_Plex_Mono, Outfit } from "next/font/google";
import localFont from "next/font/local";
import { GradientBg } from "@/components/GradientBg";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

/**
 * Display / logo face — Cal Sans (SIL Open Font License, free)
 * Geometric modern display font in the same logo/showreel class as commercial
 * Nexxa (Envato). Self-hosted from @fontsource/cal-sans — no purchase needed.
 * Body: Outfit (Google Fonts, free). Mono: IBM Plex Mono.
 */
const logo = localFont({
  src: "../fonts/CalSans-Regular.woff2",
  variable: "--font-logo",
  weight: "400",
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
});

const display = localFont({
  src: "../fonts/CalSans-Regular.woff2",
  variable: "--font-display",
  weight: "400",
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
});

const sans = Outfit({
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

import type { Metadata } from "next";
import { Outfit, Source_Sans_3 } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const display = Outfit({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const sans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "YTMP — Download, Convert & Edit Media",
    template: "%s · YTMP",
  },
  description:
    "Local Windows media toolkit: download from YouTube and more, convert, trim, compress, GIF, and polish audio — with a subscription license.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body>
        <header className="sans border-b border-[#2a4558]/bg-[#0a1219]/70 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
            <Link href="/" className="text-xl font-semibold tracking-tight text-[#2dd4bf] no-underline">
              YTMP
            </Link>
            <nav className="flex flex-wrap gap-4 text-sm text-[#7a96a8]">
              <Link href="/features" className="no-underline hover:text-white">
                Features
              </Link>
              <Link href="/tools" className="no-underline hover:text-white">
                Toolkit
              </Link>
              <Link href="/pricing" className="no-underline hover:text-white">
                Pricing
              </Link>
              <Link href="/download" className="no-underline hover:text-white">
                Download
              </Link>
              <Link href="/status" className="no-underline hover:text-white">
                Order status
              </Link>
              <Link href="/faq" className="no-underline hover:text-white">
                FAQ
              </Link>
              <Link href="/support" className="no-underline hover:text-white">
                Support
              </Link>
              <Link href="/activate" className="no-underline hover:text-white">
                Activate
              </Link>
              <Link href="/account" className="no-underline hover:text-white">
                Account
              </Link>
            </nav>
          </div>
        </header>
        {children}
        <footer className="sans mt-20 border-t border-[#2a4558] py-10 text-center text-sm text-[#7a96a8]">
          <p>
            <Link href="/legal/terms" className="no-underline hover:text-white">
              Terms
            </Link>
            {" · "}
            <Link href="/legal/privacy" className="no-underline hover:text-white">
              Privacy
            </Link>
            {" · "}
            <Link href="/changelog" className="no-underline hover:text-white">
              Changelog
            </Link>
            {" · "}
            <Link href="/docs" className="no-underline hover:text-white">
              Docs
            </Link>
          </p>
          <p className="mt-2">Only download content you have the right to use.</p>
        </footer>
      </body>
    </html>
  );
}

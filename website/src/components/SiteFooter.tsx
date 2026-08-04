import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";

export function SiteFooter() {
  return (
    <footer className="mt-auto px-3 pb-8 sm:px-4 sm:pb-10 md:px-6">
      <div className="glass-bar glass-bar--float card-3d mx-auto max-w-6xl overflow-hidden rounded-[var(--radius-lg)]">
        <div className="grid gap-8 px-5 py-10 sm:gap-10 sm:px-6 sm:py-12 md:grid-cols-[1.35fr_1fr_1fr] md:px-10">
          <div>
            <BrandLogo size={42} showWordmark wordmarkClassName="logo-type text-xl tracking-[-0.04em]" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-[var(--muted)]">
              YouTube, Spotify, SoundCloud & more — download, convert, keep files private on Windows.
            </p>
          </div>
          <div>
            <p className="label">Product</p>
            <ul className="mt-3 space-y-2 text-sm text-[var(--muted)]">
              <li>
                <Link href="/features" className="no-underline hover:text-[var(--ink)]">
                  Features
                </Link>
              </li>
              <li>
                <Link href="/tools" className="no-underline hover:text-[var(--ink)]">
                  Toolkit
                </Link>
              </li>
              <li>
                <Link href="/download" className="no-underline hover:text-[var(--ink)]">
                  Download
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="no-underline hover:text-[var(--ink)]">
                  Pricing
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="label">Help</p>
            <ul className="mt-3 space-y-2 text-sm text-[var(--muted)]">
              <li>
                <Link href="/docs" className="no-underline hover:text-[var(--ink)]">
                  Docs
                </Link>
              </li>
              <li>
                <Link href="/faq" className="no-underline hover:text-[var(--ink)]">
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="/status" className="no-underline hover:text-[var(--ink)]">
                  Order status
                </Link>
              </li>
              <li>
                <Link href="/support" className="no-underline hover:text-[var(--ink)]">
                  Support
                </Link>
              </li>
              <li>
                <Link href="/legal/terms" className="no-underline hover:text-[var(--ink)]">
                  Terms
                </Link>
              </li>
              <li>
                <Link href="/legal/privacy" className="no-underline hover:text-[var(--ink)]">
                  Privacy
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-[var(--line)] px-6 py-4 md:px-10">
          <p className="text-xs text-[var(--faint)]">
            © {new Date().getFullYear()} YTMP · Only download content you have rights to use
          </p>
        </div>
      </div>
    </footer>
  );
}

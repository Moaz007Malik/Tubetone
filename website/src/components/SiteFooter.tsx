import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-auto px-4 pb-8 md:px-6">
      <div className="glass-bar mx-auto max-w-6xl overflow-hidden rounded-[28px]">
        <div className="grid gap-10 px-6 py-12 md:grid-cols-[1.3fr_1fr_1fr] md:px-10">
          <div>
            <p className="logo-type text-2xl tracking-[-0.04em]">YTMP</p>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-[var(--muted)]">
              Local media toolkit for Windows. Download, convert, edit — licensed, private, glossy.
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

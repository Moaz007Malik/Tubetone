"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV = [
  { href: "/features", label: "Features" },
  { href: "/tools", label: "Toolkit" },
  { href: "/pricing", label: "Pricing" },
  { href: "/download", label: "Download" },
  { href: "/docs", label: "Docs" },
  { href: "/faq", label: "FAQ" },
  { href: "/support", label: "Support" },
];

export function SiteHeader() {
  const path = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 px-4 pt-4 md:px-6">
      <div className="glass-bar mx-auto flex max-w-6xl items-center justify-between gap-4 rounded-[var(--radius)] px-4 py-3 md:px-6">
        <Link href="/" className="flex items-center gap-2 no-underline">
          <span className="grid h-9 w-9 place-items-center rounded-2xl bg-gradient-to-br from-[var(--violet)] via-[var(--magenta)] to-[var(--sky)] text-sm font-bold text-white shadow-md">
            Y
          </span>
          <span className="logo-type text-xl tracking-[-0.04em]">YTMP</span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV.map((item) => {
            const active = path === item.href || path.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-3 py-1.5 text-sm font-medium no-underline transition-colors ${
                  active
                    ? "bg-[var(--signal-dim)] text-[var(--ink)]"
                    : "text-[var(--muted)] hover:text-[var(--ink)]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          <Link href="/activate" className="btn-ghost ml-2 !px-4 !py-2 !text-sm">
            Activate
          </Link>
          <Link href="/pricing" className="btn-primary ml-1 !px-4 !py-2 !text-sm">
            Get license
          </Link>
        </nav>

        <button
          type="button"
          className="rounded-full border border-[var(--line)] bg-white/5 px-3 py-1.5 text-sm font-semibold text-[var(--ink)] lg:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>

      {open ? (
        <div className="glass-bar mx-auto mt-2 max-w-6xl rounded-[var(--radius)] p-4 lg:hidden">
          <div className="flex flex-col gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-2 text-sm font-medium text-[var(--muted)] no-underline hover:bg-[var(--signal-dim)] hover:text-[var(--ink)]"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/activate"
              onClick={() => setOpen(false)}
              className="rounded-xl px-3 py-2 text-sm font-semibold text-[var(--violet)] no-underline"
            >
              Activate
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}

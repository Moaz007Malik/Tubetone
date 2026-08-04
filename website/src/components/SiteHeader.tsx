"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";

const NAV = [
  { href: "/features", label: "Features" },
  { href: "/tools", label: "Toolkit" },
  { href: "/pricing", label: "Pricing" },
  { href: "/download", label: "Download" },
  { href: "/docs", label: "Docs" },
  { href: "/support", label: "Support" },
];

export function SiteHeader() {
  const path = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="site-header sticky top-0 z-50 px-4 pt-3 md:px-6 md:pt-4">
      <div className="site-header__bar mx-auto flex max-w-6xl items-center justify-between gap-3">
        <Link href="/" className="site-header__brand no-underline">
          <BrandLogo size={36} priority showWordmark wordmarkClassName="logo-type text-[1.05rem] tracking-[-0.04em]" />
        </Link>

        <nav className="site-header__nav hidden lg:flex" aria-label="Primary">
          {NAV.map((item) => {
            const active = path === item.href || path.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`site-header__link ${active ? "is-active" : ""}`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <Link href="/activate" className="site-header__text-link">
            Activate
          </Link>
          <Link href="/pricing" className="btn-primary site-header__cta">
            Get license
          </Link>
        </div>

        <button
          type="button"
          className="site-header__menu lg:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>

      {open ? (
        <div className="site-header__drawer mx-auto mt-2 max-w-6xl lg:hidden">
          <div className="flex flex-col gap-0.5">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="site-header__drawer-link"
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-2 flex flex-col gap-2 border-t border-[var(--line)] pt-3">
              <Link
                href="/activate"
                onClick={() => setOpen(false)}
                className="site-header__drawer-link font-semibold text-[var(--violet-deep)]"
              >
                Activate license
              </Link>
              <Link
                href="/pricing"
                onClick={() => setOpen(false)}
                className="btn-primary text-center"
              >
                Get license
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}

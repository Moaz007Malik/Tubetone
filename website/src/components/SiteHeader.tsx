"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";

const NAV = [
  { href: "/features", label: "Features" },
  { href: "/tools", label: "Toolkit" },
  { href: "/pricing", label: "Pricing" },
  { href: "/download", label: "Download" },
  { href: "/docs", label: "Docs" },
  { href: "/support", label: "Support" },
];

/** Desktop nav starts at this width (matches CSS --bp-nav) */
const NAV_DESKTOP_MQ = "(min-width: 1024px)";

export function SiteHeader() {
  const path = usePathname();
  const [open, setOpen] = useState(false);

  // Close drawer when route changes or viewport becomes desktop
  useEffect(() => {
    setOpen(false);
  }, [path]);

  useEffect(() => {
    const mq = window.matchMedia(NAV_DESKTOP_MQ);
    const onChange = () => {
      if (mq.matches) setOpen(false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.classList.add("nav-open");
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.classList.remove("nav-open");
    };
  }, [open]);

  return (
    <header className="site-header sticky top-0 z-50 px-3 pt-3 sm:px-4 md:px-6 md:pt-4">
      <div className="site-header__bar mx-auto flex max-w-6xl items-center justify-between gap-2 sm:gap-3">
        <Link href="/" className="site-header__brand no-underline" onClick={() => setOpen(false)}>
          <BrandLogo
            size={32}
            priority
            showWordmark
            wordmarkClassName="logo-type text-[0.98rem] tracking-[-0.04em] sm:text-[1.05rem]"
          />
        </Link>

        <nav className="site-header__nav" aria-label="Primary">
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

        <div className="site-header__actions">
          <Link href="/activate" className="site-header__text-link">
            Activate
          </Link>
          <Link href="/pricing" className="btn-primary site-header__cta">
            Get license
          </Link>
        </div>

        <button
          type="button"
          className="site-header__menu"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="site-mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>

      <div
        id="site-mobile-nav"
        className={`site-header__drawer mx-auto mt-2 max-w-6xl ${open ? "is-open" : ""}`}
        hidden={!open}
      >
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
    </header>
  );
}

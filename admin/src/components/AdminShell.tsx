"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { checkSession, logout } from "@/lib/api";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: "◉" },
  { href: "/orders", label: "Orders", icon: "▣" },
  { href: "/licenses", label: "Licenses", icon: "◈" },
  { href: "/coupons", label: "Coupons", icon: "%" },
  { href: "/users", label: "Users", icon: "◎" },
  { href: "/audit", label: "Audit", icon: "◌" },
  { href: "/settings", label: "Settings", icon: "⚙" },
];

/** Survives client navigations; avoids full-page “Checking session…” every click. */
let sessionKnownOk = false;

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(sessionKnownOk);
  const [mobileNav, setMobileNav] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (sessionKnownOk) {
      setReady(true);
      // Quiet revalidation — UI stays mounted
      void checkSession().then((ok) => {
        if (cancelled) return;
        if (!ok) {
          sessionKnownOk = false;
          router.replace("/login");
        }
      });
      return () => {
        cancelled = true;
      };
    }

    void checkSession().then((ok) => {
      if (cancelled) return;
      if (!ok) {
        sessionKnownOk = false;
        router.replace("/login");
        return;
      }
      sessionKnownOk = true;
      setReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [router]);

  // Close mobile nav on route change
  useEffect(() => {
    setMobileNav(false);
  }, [pathname]);

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="flex flex-col items-center gap-3 text-[var(--muted)]">
          <div className="spin" aria-hidden />
          <span className="text-sm">Loading console…</span>
        </div>
      </div>
    );
  }

  const pageLabel = nav.find((n) => n.href === pathname)?.label ?? "Admin";

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      {/* Mobile top bar */}
      <header className="admin-topbar sticky top-0 z-20 flex items-center justify-between border-b border-[var(--border)] px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2.5">
          <BrandMark />
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
              YTMP
            </p>
            <p className="text-sm font-semibold text-[var(--accent)]">Admin · {pageLabel}</p>
          </div>
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => setMobileNav((v) => !v)}
          aria-expanded={mobileNav}
        >
          {mobileNav ? "Close" : "Menu"}
        </button>
      </header>

      <aside
        className={`${
          mobileNav ? "flex" : "hidden"
        } flex-col border-b border-[var(--border)] bg-[var(--bg-elevated)] p-4 lg:flex lg:min-h-screen lg:border-b-0 lg:border-r lg:p-5`}
      >
        <div className="mb-8 hidden items-center gap-3 lg:flex">
          <BrandMark />
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
              YTMP
            </p>
            <h1 className="text-lg font-semibold tracking-tight text-[var(--accent)]">Admin</h1>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {nav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-link flex items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2.5 text-sm transition-colors ${
                  active ? "nav-link-active" : ""
                }`}
              >
                <span className="w-4 text-center opacity-80" aria-hidden>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          className="btn btn-ghost mt-6 w-full text-[var(--muted)]"
          onClick={async () => {
            sessionKnownOk = false;
            await logout();
            router.replace("/login");
          }}
        >
          Sign out
        </button>
      </aside>

      <main className="min-w-0 p-4 sm:p-6 lg:p-8">
        <div className="fade-in mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}

function BrandMark() {
  return (
    <div
      className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--accent-dim)] text-sm font-bold text-[var(--accent)] ring-1 ring-[color-mix(in_srgb,var(--accent)_30%,transparent)]"
      aria-hidden
    >
      YT
    </div>
  );
}

/** Call after successful login so next shell open skips the gate. */
export function markSessionOk() {
  sessionKnownOk = true;
}

export function clearSessionOk() {
  sessionKnownOk = false;
}

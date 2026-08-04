"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { checkSession, logout } from "@/lib/api";

const nav = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/orders", label: "Orders" },
  { href: "/licenses", label: "Licenses" },
  { href: "/coupons", label: "Coupons" },
  { href: "/users", label: "Users" },
  { href: "/audit", label: "Audit log" },
  { href: "/settings", label: "Settings" },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    checkSession().then((ok) => {
      if (cancelled) return;
      if (!ok) router.replace("/login");
      else setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center text-[#7a96a8]">
        Checking session…
      </div>
    );
  }

  return (
    <div className="min-h-screen md:grid md:grid-cols-[220px_1fr]">
      <aside className="border-b border-[#2a4558] bg-[#12202b] p-4 md:border-b-0 md:border-r">
        <div className="mb-6">
          <p className="text-xs uppercase tracking-[0.2em] text-[#7a96a8]">YTMP</p>
          <h1 className="text-lg font-semibold text-[#2dd4bf]">Admin</h1>
        </div>
        <nav className="flex flex-wrap gap-2 md:flex-col">
          {nav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-2 text-sm no-underline ${
                  active
                    ? "bg-[#2dd4bf] font-semibold !text-[#042f2e]"
                    : "text-[#c5d4de] hover:bg-[#1a2d3c] hover:text-white"
                }`}
                style={active ? { color: "#042f2e" } : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <button
          className="mt-8 text-sm text-[#7a96a8] hover:text-white"
          onClick={async () => {
            await logout();
            router.replace("/login");
          }}
        >
          Sign out
        </button>
      </aside>
      <main className="p-6">{children}</main>
    </div>
  );
}

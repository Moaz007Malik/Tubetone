"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { markSessionOk } from "@/components/AdminShell";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api("/v1/admin/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      markSessionOk();
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden p-6">
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(ellipse 50% 40% at 50% 0%, rgba(61,222,168,0.14), transparent 70%)",
        }}
      />
      <form
        onSubmit={onSubmit}
        className="panel relative w-full max-w-md p-7 shadow-[var(--shadow)] sm:p-8"
        autoComplete="on"
      >
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--accent-dim)] text-base font-bold text-[var(--accent)] ring-1 ring-[color-mix(in_srgb,var(--accent)_30%,transparent)]">
            YT
          </div>
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
              YTMP
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--accent)]">Admin</h1>
          </div>
        </div>
        <p className="mt-3 text-sm text-[var(--muted)]">
          Sign in to manage licenses, orders, and subscriptions.
        </p>

        <label className="mt-7 block text-xs font-medium text-[var(--muted)]" htmlFor="admin-email">
          Email
        </label>
        <input
          id="admin-email"
          className="field mt-1.5"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          name="email"
          required
          autoComplete="username"
          placeholder="Enter email"
          autoFocus
        />

        <label
          className="mt-4 block text-xs font-medium text-[var(--muted)]"
          htmlFor="admin-password"
        >
          Password
        </label>
        <input
          id="admin-password"
          className="field mt-1.5"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          name="password"
          required
          autoComplete="current-password"
          placeholder="Enter password"
        />

        {error ? <p className="alert-err">{error}</p> : null}

        <button type="submit" disabled={loading} className="btn btn-primary mt-6 w-full py-2.5">
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}

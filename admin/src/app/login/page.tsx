"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@ytmp.app");
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
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen grid place-items-center p-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-xl border border-[#2a4558] bg-[#12202b] p-6 shadow-xl"
      >
        <p className="text-xs uppercase tracking-[0.2em] text-[#7a96a8]">YTMP</p>
        <h1 className="mt-2 text-2xl font-semibold text-[#2dd4bf]">Admin</h1>
        <p className="mt-1 text-sm text-[#7a96a8]">Sign in to manage licenses & orders</p>
        <label className="mt-6 block text-xs text-[#7a96a8]">Email</label>
        <input
          className="mt-1 w-full rounded-lg border border-[#2a4558] bg-[#0a1219] px-3 py-2 outline-none focus:border-[#2dd4bf]"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          required
          autoComplete="username"
        />
        <label className="mt-4 block text-xs text-[#7a96a8]">Password</label>
        <input
          className="mt-1 w-full rounded-lg border border-[#2a4558] bg-[#0a1219] px-3 py-2 outline-none focus:border-[#2dd4bf]"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          required
          autoComplete="current-password"
        />
        {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
        <button
          disabled={loading}
          className="mt-6 w-full rounded-lg bg-[#2dd4bf] px-4 py-2.5 font-semibold text-[#042f2e] disabled:opacity-60"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}

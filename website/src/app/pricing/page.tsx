"use client";

import { FormEvent, useState } from "react";
import { api } from "@/lib/api";

const plans = [
  { id: "trial", label: "Trial", price: "Free", blurb: "7-day evaluation (manual approval)" },
  { id: "monthly", label: "Monthly", price: "$5/mo", blurb: "Full Music + Video downloads" },
  { id: "yearly", label: "Yearly", price: "$49/yr", blurb: "Best value for regular use" },
];

export default function PricingPage() {
  const [plan, setPlan] = useState("monthly");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [coupon, setCoupon] = useState("");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState("");
  const [orderId, setOrderId] = useState("");
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMsg("");
    try {
      if (coupon.trim()) {
        const v = await api<{ valid: boolean; error?: string }>("/v1/coupons/validate", {
          method: "POST",
          body: JSON.stringify({ code: coupon }),
        });
        if (!v.valid) throw new Error(v.error || "Invalid coupon");
      }
      const res = await api<{ orderId: string; message: string }>("/v1/orders", {
        method: "POST",
        body: JSON.stringify({
          email,
          name,
          plan,
          couponCode: coupon || undefined,
          note: note || "Manual payment request",
        }),
      });
      setOrderId(res.orderId);
      setMsg(res.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <main className="sans mx-auto max-w-5xl px-5 py-16">
      <h1 className="font-[family-name:var(--font-display)] text-4xl text-[#2dd4bf]">Pricing</h1>
      <p className="mt-2 max-w-2xl text-[#7a96a8]">
        Manual payments for now — submit a request, pay via the method we confirm, then receive your
        license key.
      </p>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {plans.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPlan(p.id)}
            className={`rounded-2xl border p-5 text-left ${
              plan === p.id
                ? "border-[#2dd4bf] bg-[#1a2d3c]"
                : "border-[#2a4558] bg-[#12202b]"
            }`}
          >
            <p className="text-sm text-[#7a96a8]">{p.label}</p>
            <p className="mt-2 text-2xl font-semibold">{p.price}</p>
            <p className="mt-2 text-sm text-[#7a96a8]">{p.blurb}</p>
          </button>
        ))}
      </div>
      <form onSubmit={submit} className="mt-10 max-w-lg space-y-3 rounded-2xl border border-[#2a4558] bg-[#12202b] p-6">
        <h2 className="text-lg font-semibold">Request access</h2>
        <input
          className="w-full rounded-lg border border-[#2a4558] bg-[#0a1219] px-3 py-2"
          placeholder="Email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="w-full rounded-lg border border-[#2a4558] bg-[#0a1219] px-3 py-2"
          placeholder="Name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="w-full rounded-lg border border-[#2a4558] bg-[#0a1219] px-3 py-2"
          placeholder="Coupon (e.g. WELCOME7)"
          value={coupon}
          onChange={(e) => setCoupon(e.target.value)}
        />
        <textarea
          className="w-full rounded-lg border border-[#2a4558] bg-[#0a1219] px-3 py-2"
          placeholder="Payment note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
        />
        <button className="rounded-lg bg-[#2dd4bf] px-4 py-2.5 font-semibold text-[#042f2e]">
          Submit order
        </button>
        {msg ? <p className="text-sm text-emerald-400">{msg}</p> : null}
        {orderId ? (
          <p className="text-xs text-[#7a96a8]">
            Order ID: <span className="font-mono text-white">{orderId}</span> — save this to check status.
          </p>
        ) : null}
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
      </form>
    </main>
  );
}

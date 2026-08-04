"use client";

import { FormEvent, useState } from "react";
import { api } from "@/lib/api";
import { Field, PageHero, PageShell, TextArea } from "@/components/PageShell";

const plans = [
  { id: "trial", label: "Trial", price: "Free", blurb: "7-day evaluation" },
  { id: "monthly", label: "Monthly", price: "$5/mo", blurb: "Full Music + Video" },
  { id: "yearly", label: "Yearly", price: "$49/yr", blurb: "Best for regular use" },
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
    <PageShell>
      <PageHero
        kicker="Licensing"
        title="Simple plans"
        lead="Manual payments for now — submit a request, pay as instructed, receive your license key."
      />

      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPlan(p.id)}
            className={`plan-card ${plan === p.id ? "is-active" : ""}`}
          >
            <p className="label">{p.label}</p>
            <p className="display-title mt-3 text-2xl tracking-tight">{p.price}</p>
            <p className="mt-2 text-sm text-[var(--muted)]">{p.blurb}</p>
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="surface mt-10 max-w-lg space-y-3">
        <h2 className="display-title text-lg tracking-tight">Request access</h2>
        <Field
          placeholder="Email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Field
          placeholder="Name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Field
          placeholder="Coupon (e.g. WELCOME7)"
          value={coupon}
          onChange={(e) => setCoupon(e.target.value)}
        />
        <TextArea
          placeholder="Payment note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
        />
        <button type="submit" className="btn-primary">
          Submit order
        </button>
        {msg ? <p className="text-sm font-medium text-[var(--violet)]">{msg}</p> : null}
        {orderId ? (
          <p className="font-mono text-xs text-[var(--muted)]">
            Order ID: <span className="text-[var(--ink)]">{orderId}</span>
          </p>
        ) : null}
        {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
      </form>
    </PageShell>
  );
}

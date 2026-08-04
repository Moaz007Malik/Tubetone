"use client";

import { FormEvent, useCallback, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { Field, PageHero, PageShell, TextArea } from "@/components/PageShell";

type PlanId = "trial" | "monthly" | "yearly";

type Plan = {
  id: PlanId;
  label: string;
  amount: number;
  unit: string;
  blurb: string;
  days: number;
};

const plans: Plan[] = [
  { id: "trial", label: "Trial", amount: 0, unit: "", blurb: "7-day evaluation", days: 7 },
  { id: "monthly", label: "Monthly", amount: 5, unit: "/mo", blurb: "Full Music + Video", days: 30 },
  { id: "yearly", label: "Yearly", amount: 49, unit: "/yr", blurb: "Best for regular use", days: 365 },
];

type AppliedCoupon = {
  code: string;
  type: string;
  value: number;
  message: string;
  detail: string;
  originalPrice: number;
  finalPrice: number;
  discountAmount: number;
  freeDays: number;
  baseDays: number;
  totalDays: number;
  plan: string;
};

function money(n: number): string {
  if (n <= 0) return "Free";
  if (Number.isInteger(n)) return `$${n}`;
  return `$${n.toFixed(2)}`;
}

function formatPlanPrice(amount: number, unit: string): string {
  if (amount <= 0) return "Free";
  return `${money(amount)}${unit}`;
}

export default function PricingPage() {
  const [plan, setPlan] = useState<PlanId>("monthly");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [couponInput, setCouponInput] = useState("");
  const [applied, setApplied] = useState<AppliedCoupon | null>(null);
  const [couponError, setCouponError] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState("");
  const [orderId, setOrderId] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const selected = useMemo(() => plans.find((p) => p.id === plan)!, [plan]);

  const displayPrice = useMemo(() => {
    if (applied && applied.plan === plan) {
      return {
        amount: applied.finalPrice,
        original: applied.originalPrice,
        discount: applied.discountAmount,
        freeDays: applied.freeDays,
        totalDays: applied.totalDays,
      };
    }
    return {
      amount: selected.amount,
      original: selected.amount,
      discount: 0,
      freeDays: 0,
      totalDays: selected.days,
    };
  }, [applied, plan, selected]);

  const clearCoupon = useCallback(() => {
    setApplied(null);
    setCouponError("");
  }, []);

  async function applyCoupon(e?: FormEvent) {
    e?.preventDefault();
    setCouponError("");
    setMsg("");
    const code = couponInput.trim();
    if (!code) {
      setCouponError("Enter a coupon code");
      setApplied(null);
      return;
    }
    setCouponLoading(true);
    try {
      const v = await api<{
        valid: boolean;
        error?: string;
        code?: string;
        type?: string;
        value?: number;
        message?: string;
        detail?: string;
        originalPrice?: number;
        finalPrice?: number;
        discountAmount?: number;
        freeDays?: number;
        baseDays?: number;
        totalDays?: number;
        plan?: string;
      }>("/v1/coupons/validate", {
        method: "POST",
        body: JSON.stringify({ code, plan }),
      });
      if (!v.valid) {
        setApplied(null);
        throw new Error(v.error || "Invalid coupon");
      }
      setApplied({
        code: v.code || code.toUpperCase(),
        type: v.type || "",
        value: v.value ?? 0,
        message: v.message || "Coupon applied",
        detail: v.detail || "",
        originalPrice: v.originalPrice ?? selected.amount,
        finalPrice: v.finalPrice ?? selected.amount,
        discountAmount: v.discountAmount ?? 0,
        freeDays: v.freeDays ?? 0,
        baseDays: v.baseDays ?? selected.days,
        totalDays: v.totalDays ?? selected.days,
        plan: v.plan || plan,
      });
      setCouponInput(v.code || code.toUpperCase());
    } catch (err) {
      setApplied(null);
      setCouponError(err instanceof Error ? err.message : "Could not apply coupon");
    } finally {
      setCouponLoading(false);
    }
  }

  // When plan changes after coupon applied, auto re-validate if still have code
  async function revalidateIfNeeded(nextPlan: PlanId) {
    if (!applied && !couponInput.trim()) {
      setPlan(nextPlan);
      return;
    }
    setPlan(nextPlan);
    const code = (applied?.code || couponInput).trim();
    if (!code) {
      setApplied(null);
      return;
    }
    setCouponLoading(true);
    setCouponError("");
    try {
      const v = await api<{
        valid: boolean;
        error?: string;
        code?: string;
        type?: string;
        value?: number;
        message?: string;
        detail?: string;
        originalPrice?: number;
        finalPrice?: number;
        discountAmount?: number;
        freeDays?: number;
        baseDays?: number;
        totalDays?: number;
        plan?: string;
      }>("/v1/coupons/validate", {
        method: "POST",
        body: JSON.stringify({ code, plan: nextPlan }),
      });
      if (!v.valid) {
        setApplied(null);
        setCouponError(v.error || "Invalid coupon");
        return;
      }
      const p = plans.find((x) => x.id === nextPlan)!;
      setApplied({
        code: v.code || code.toUpperCase(),
        type: v.type || "",
        value: v.value ?? 0,
        message: v.message || "Coupon applied",
        detail: v.detail || "",
        originalPrice: v.originalPrice ?? p.amount,
        finalPrice: v.finalPrice ?? p.amount,
        discountAmount: v.discountAmount ?? 0,
        freeDays: v.freeDays ?? 0,
        baseDays: v.baseDays ?? p.days,
        totalDays: v.totalDays ?? p.days,
        plan: v.plan || nextPlan,
      });
    } catch (err) {
      setApplied(null);
      setCouponError(err instanceof Error ? err.message : "Could not apply coupon");
    } finally {
      setCouponLoading(false);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMsg("");
    setSubmitting(true);
    try {
      const couponCode = applied?.code || undefined;
      if (couponInput.trim() && !applied) {
        throw new Error("Click Apply to validate your coupon first");
      }
      const res = await api<{ orderId: string; message: string }>("/v1/orders", {
        method: "POST",
        body: JSON.stringify({
          email,
          name,
          plan,
          couponCode,
          note: note || "Manual payment request",
        }),
      });
      setOrderId(res.orderId);
      setMsg(res.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageShell>
      <PageHero
        kicker="Licensing"
        title="Simple plans"
        lead="Manual payments for now — submit a request, pay as instructed, receive your license key."
      />

      <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 md:grid-cols-3">
        {plans.map((p) => {
          const isSelected = plan === p.id;
          const showDiscount =
            isSelected && applied && applied.plan === p.id && applied.finalPrice !== applied.originalPrice;
          const showDays =
            isSelected && applied && applied.plan === p.id && applied.freeDays > 0;

          return (
            <button
              key={p.id}
              type="button"
              onClick={() => void revalidateIfNeeded(p.id)}
              className={`plan-card text-left ${isSelected ? "is-active" : ""}`}
            >
              <p className="label">{p.label}</p>
              <div className="mt-3">
                {showDiscount ? (
                  <>
                    <p className="text-sm text-[var(--muted)] line-through decoration-[var(--muted)]">
                      {formatPlanPrice(p.amount, p.unit)}
                    </p>
                    <p className="display-title text-2xl tracking-tight text-[var(--violet)]">
                      {formatPlanPrice(applied!.finalPrice, p.unit)}
                    </p>
                  </>
                ) : (
                  <p className="display-title text-2xl tracking-tight">
                    {isSelected && applied && applied.plan === p.id
                      ? formatPlanPrice(displayPrice.amount, p.unit)
                      : formatPlanPrice(p.amount, p.unit)}
                  </p>
                )}
              </div>
              <p className="mt-2 text-sm text-[var(--muted)]">{p.blurb}</p>
              {showDays ? (
                <p className="mt-2 text-xs font-medium text-[var(--violet)]">
                  +{applied!.freeDays} free day{applied!.freeDays === 1 ? "" : "s"}
                  {applied!.totalDays ? ` · ~${applied!.totalDays} days total` : ""}
                </p>
              ) : null}
              {isSelected && applied && applied.plan === p.id && applied.discountAmount > 0 ? (
                <p className="mt-1 text-xs font-medium text-[var(--violet)]">
                  You save {money(applied.discountAmount)}
                </p>
              ) : null}
            </button>
          );
        })}
      </div>

      <form onSubmit={submit} className="surface mt-8 w-full max-w-lg space-y-3 sm:mt-10">
        <h2 className="display-title text-lg tracking-tight">Request access</h2>

        <div className="rounded-xl border border-[var(--line)] bg-[rgba(0,0,0,0.2)] px-3 py-3">
          <p className="label">Order summary</p>
          <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-sm text-[var(--muted)]">{selected.label} plan</span>
            <div className="text-right">
              {displayPrice.discount > 0 ? (
                <>
                  <span className="mr-2 text-sm text-[var(--muted)] line-through">
                    {money(displayPrice.original)}
                  </span>
                  <span className="display-title text-xl text-[var(--violet)]">
                    {formatPlanPrice(displayPrice.amount, selected.unit)}
                  </span>
                </>
              ) : (
                <span className="display-title text-xl">
                  {formatPlanPrice(displayPrice.amount, selected.unit)}
                </span>
              )}
            </div>
          </div>
          {displayPrice.freeDays > 0 ? (
            <p className="mt-2 text-sm text-[var(--violet)]">
              +{displayPrice.freeDays} free day{displayPrice.freeDays === 1 ? "" : "s"} included after
              payment (about {displayPrice.totalDays} days total).
            </p>
          ) : null}
          {applied ? (
            <p className="mt-2 text-xs text-[var(--muted)]">
              Coupon <span className="font-mono text-[var(--ink)]">{applied.code}</span> applied
            </p>
          ) : null}
        </div>

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

        <div>
          <div className="flex flex-wrap gap-2">
            <Field
              className="min-w-0 flex-1"
              placeholder="Coupon code"
              value={couponInput}
              onChange={(e) => {
                setCouponInput(e.target.value);
                if (applied) setApplied(null);
                setCouponError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void applyCoupon();
                }
              }}
              autoComplete="off"
              spellCheck={false}
            />
            <button
              type="button"
              className="btn-ghost shrink-0"
              disabled={couponLoading}
              onClick={() => void applyCoupon()}
            >
              {couponLoading ? "Checking…" : "Apply"}
            </button>
            {applied ? (
              <button type="button" className="btn-ghost shrink-0" onClick={clearCoupon}>
                Remove
              </button>
            ) : null}
          </div>
          {couponError ? (
            <p className="mt-2 text-sm text-[var(--danger)]">{couponError}</p>
          ) : null}
          {applied ? (
            <div className="mt-2 rounded-lg border border-[rgba(139,92,246,0.35)] bg-[rgba(139,92,246,0.1)] px-3 py-2.5">
              <p className="text-sm font-medium text-[var(--violet)]">{applied.message}</p>
              {applied.detail ? (
                <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">{applied.detail}</p>
              ) : null}
            </div>
          ) : null}
        </div>

        <TextArea
          placeholder="Payment note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
        />
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? "Submitting…" : "Submit order"}
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

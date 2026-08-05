"use client";

import { FormEvent, useState } from "react";
import { api } from "@/lib/api";
import { Field, PageHero, PageShell } from "@/components/PageShell";

type Status = {
  id: string;
  status: string;
  plan: string;
  email: string;
  licenseKey: string | null;
  updatedAt: string;
};

export default function OrderStatusPage() {
  const [orderId, setOrderId] = useState("");
  const [data, setData] = useState<Status | null>(null);
  const [error, setError] = useState("");

  async function check(e: FormEvent) {
    e.preventDefault();
    setError("");
    setData(null);
    try {
      const res = await api<Status>(`/v1/orders/${encodeURIComponent(orderId.trim())}/status`);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Not found");
    }
  }

  return (
    <PageShell>
      <PageHero
        kicker="Orders"
        title="Order status"
        lead="Enter the order ID from your Pricing request."
      />
      <form onSubmit={check} className="surface flex flex-wrap items-end gap-3">
        <Field
          className="min-w-[240px] flex-1"
          placeholder="Order ID"
          value={orderId}
          onChange={(e) => setOrderId(e.target.value)}
          required
        />
        <button type="submit" className="btn-primary">
          Check
        </button>
      </form>
      {error ? <p className="mt-4 text-sm text-[var(--danger)]">{error}</p> : null}
      {data ? (
        <div className="surface mt-6">
          <span className="status-chip">{data.status}</span>
          <p className="mt-4 text-sm text-[var(--muted)]">
            Plan {data.plan} · {data.email}
          </p>
          {data.licenseKey ? (
            <p className="mt-4 rounded-[var(--radius-sm)] bg-white/80 px-4 py-3 font-mono text-sm text-[var(--violet-deep)]">
              {data.licenseKey}
            </p>
          ) : (
            <p className="mt-4 text-sm text-[var(--muted)]">
              License key appears here once the order is marked paid.
            </p>
          )}
        </div>
      ) : null}
    </PageShell>
  );
}

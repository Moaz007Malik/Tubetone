"use client";

import { FormEvent, useState } from "react";
import { api } from "@/lib/api";

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
    <main className="sans mx-auto max-w-3xl px-5 py-16">
      <h1 className="font-[family-name:var(--font-display)] text-4xl text-[#2dd4bf]">Order status</h1>
      <p className="mt-3 text-[#7a96a8]">
        Enter the order ID from your Pricing request to see if your license is ready.
      </p>
      <form onSubmit={check} className="mt-8 flex flex-wrap gap-2">
        <input
          className="min-w-[240px] flex-1 rounded-lg border border-[#2a4558] bg-[#0a1219] px-3 py-2"
          placeholder="Order ID"
          value={orderId}
          onChange={(e) => setOrderId(e.target.value)}
          required
        />
        <button className="rounded-lg bg-[#2dd4bf] px-4 py-2 font-semibold text-[#042f2e]">
          Check
        </button>
      </form>
      {error ? <p className="mt-4 text-red-400">{error}</p> : null}
      {data ? (
        <div className="mt-6 rounded-2xl border border-[#2a4558] bg-[#12202b] p-6">
          <p>
            Status: <strong className="uppercase text-[#2dd4bf]">{data.status}</strong>
          </p>
          <p className="mt-2 text-sm text-[#7a96a8]">
            Plan {data.plan} · {data.email}
          </p>
          {data.licenseKey ? (
            <p className="mt-4 font-mono text-[#2dd4bf]">{data.licenseKey}</p>
          ) : (
            <p className="mt-4 text-sm text-[#7a96a8]">
              License key appears here once the order is marked paid.
            </p>
          )}
        </div>
      ) : null}
    </main>
  );
}

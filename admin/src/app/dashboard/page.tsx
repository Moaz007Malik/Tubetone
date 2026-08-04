"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { api } from "@/lib/api";

type Dash = {
  stats: {
    activeSubs: number;
    pendingOrders: number;
    totalUsers: number;
    revokedSubs: number;
  };
  recentOrders: Array<{
    id: string;
    email: string;
    plan: string;
    status: string;
    createdAt: string;
  }>;
};

export default function DashboardPage() {
  const [data, setData] = useState<Dash | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Dash>("/v1/admin/dashboard")
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  return (
    <AdminShell>
      <h2 className="text-2xl font-semibold">Dashboard</h2>
      {error ? <p className="mt-4 text-red-400">{error}</p> : null}
      {data ? (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Active subs", data.stats.activeSubs],
              ["Pending orders", data.stats.pendingOrders],
              ["Users", data.stats.totalUsers],
              ["Revoked", data.stats.revokedSubs],
            ].map(([label, value]) => (
              <div
                key={String(label)}
                className="rounded-xl border border-[#2a4558] bg-[#12202b] p-4"
              >
                <p className="text-xs uppercase tracking-wide text-[#7a96a8]">{label}</p>
                <p className="mt-2 text-3xl font-semibold text-[#2dd4bf]">{value}</p>
              </div>
            ))}
          </div>
          <h3 className="mt-8 text-lg font-medium">Recent orders</h3>
          {data.recentOrders.length === 0 ? (
            <p className="mt-3 text-sm text-[#7a96a8]">No orders yet.</p>
          ) : (
          <ul className="mt-3 divide-y divide-[#2a4558] rounded-xl border border-[#2a4558] bg-[#12202b]">
            {data.recentOrders.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <span>{o.email}</span>
                <span className="text-[#7a96a8]">{o.plan}</span>
                <span className="rounded bg-[#1a2d3c] px-2 py-0.5 text-xs uppercase">{o.status}</span>
              </li>
            ))}
          </ul>
          )}
        </>
      ) : (
        !error && <p className="mt-4 text-[#7a96a8]">Loading…</p>
      )}
    </AdminShell>
  );
}

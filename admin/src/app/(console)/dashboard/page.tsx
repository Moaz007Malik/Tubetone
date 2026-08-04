"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { statusClass } from "@/lib/ui";

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
    <>
      <header>
        <h2 className="page-title">Dashboard</h2>
        <p className="page-sub">Snapshot of licenses and payment queue.</p>
      </header>

      {error ? <p className="alert-err">{error}</p> : null}

      {data ? (
        <>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Active subs", value: data.stats.activeSubs },
              { label: "Pending orders", value: data.stats.pendingOrders },
              { label: "Users", value: data.stats.totalUsers },
              { label: "Revoked", value: data.stats.revokedSubs },
            ].map((card) => (
              <div key={card.label} className="panel p-4">
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                  {card.label}
                </p>
                <p className="mt-2 text-3xl font-semibold tracking-tight text-[var(--accent)]">
                  {card.value}
                </p>
              </div>
            ))}
          </div>

          <section className="mt-8">
            <h3 className="text-base font-semibold">Recent orders</h3>
            {data.recentOrders.length === 0 ? (
              <p className="mt-3 text-sm text-[var(--muted)]">No orders yet.</p>
            ) : (
              <div className="panel mt-3 overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Plan</th>
                      <th>Status</th>
                      <th>When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentOrders.map((o) => (
                      <tr key={o.id}>
                        <td>{o.email}</td>
                        <td className="capitalize text-[var(--muted)]">{o.plan}</td>
                        <td>
                          <span className={statusClass(o.status)}>{o.status}</span>
                        </td>
                        <td className="text-[var(--muted)]">
                          {new Date(o.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : (
        !error && (
          <div className="mt-10 flex items-center gap-3 text-sm text-[var(--muted)]">
            <div className="spin" />
            Loading metrics…
          </div>
        )
      )}
    </>
  );
}

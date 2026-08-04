"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { statusClass } from "@/lib/ui";

type Order = {
  id: string;
  email: string;
  name: string | null;
  plan: string;
  couponCode: string | null;
  note: string | null;
  status: string;
  license?: { key: string } | null;
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    api<{ orders: Order[] }>("/v1/admin/orders")
      .then((r) => setOrders(r.orders))
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function act(id: string, action: "pay" | "reject") {
    setMsg("");
    setError("");
    setBusy(id);
    try {
      const res = await api<{ licenseKey?: string }>("/v1/admin/orders", {
        method: "PATCH",
        body: JSON.stringify({ id, action }),
      });
      if (res.licenseKey) {
        setMsg(`Paid — license key: ${res.licenseKey}`);
        await navigator.clipboard.writeText(res.licenseKey).catch(() => undefined);
      } else setMsg(`Order ${action}ed`);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <header>
        <h2 className="page-title">Orders</h2>
        <p className="page-sub">
          Mark paid after manual payment — issues a license key automatically.
        </p>
      </header>

      {msg ? <p className="alert-ok">{msg}</p> : null}
      {error ? <p className="alert-err">{error}</p> : null}

      <div className="panel mt-6 overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Plan</th>
              <th>Coupon</th>
              <th>Status</th>
              <th>Key</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-[var(--muted)]">
                  No orders yet.
                </td>
              </tr>
            ) : (
              orders.map((o) => (
                <tr key={o.id}>
                  <td>
                    <div>{o.email}</div>
                    {o.note ? (
                      <div className="mt-0.5 text-xs text-[var(--muted)]">{o.note}</div>
                    ) : null}
                  </td>
                  <td className="capitalize">{o.plan}</td>
                  <td className="text-[var(--muted)]">{o.couponCode || "—"}</td>
                  <td>
                    <span className={statusClass(o.status)}>{o.status}</span>
                  </td>
                  <td className="mono text-[var(--accent)]">{o.license?.key || "—"}</td>
                  <td>
                    {o.status === "pending" ? (
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          disabled={busy === o.id}
                          onClick={() => act(o.id, "pay")}
                        >
                          Mark paid
                        </button>
                        <button
                          type="button"
                          className="btn btn-muted btn-sm"
                          disabled={busy === o.id}
                          onClick={() => act(o.id, "reject")}
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-[var(--muted)]">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { api } from "@/lib/api";

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
    }
  }

  return (
    <AdminShell>
      <h2 className="text-2xl font-semibold">Orders</h2>
      <p className="mt-1 text-sm text-[#7a96a8]">
        Mark paid after manual payment — issues a license key automatically.
      </p>
      {msg ? <p className="mt-3 text-sm text-emerald-400">{msg}</p> : null}
      {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
      <div className="mt-6 overflow-x-auto rounded-xl border border-[#2a4558]">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[#12202b] text-[#7a96a8]">
            <tr>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Plan</th>
              <th className="px-3 py-2">Coupon</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Key</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-t border-[#2a4558]">
                <td className="px-3 py-2">
                  <div>{o.email}</div>
                  {o.note ? <div className="text-xs text-[#7a96a8]">{o.note}</div> : null}
                </td>
                <td className="px-3 py-2">{o.plan}</td>
                <td className="px-3 py-2">{o.couponCode || "—"}</td>
                <td className="px-3 py-2 uppercase text-xs">{o.status}</td>
                <td className="px-3 py-2 font-mono text-xs">{o.license?.key || "—"}</td>
                <td className="px-3 py-2 space-x-2">
                  {o.status === "pending" ? (
                    <>
                      <button
                        className="rounded bg-[#2dd4bf] px-2 py-1 text-xs font-semibold text-[#042f2e]"
                        onClick={() => act(o.id, "pay")}
                      >
                        Mark paid
                      </button>
                      <button
                        className="rounded bg-[#2a4558] px-2 py-1 text-xs"
                        onClick={() => act(o.id, "reject")}
                      >
                        Reject
                      </button>
                    </>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}

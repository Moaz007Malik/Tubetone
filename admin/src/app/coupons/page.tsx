"use client";

import { FormEvent, useEffect, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { api } from "@/lib/api";

type Coupon = {
  id: string;
  code: string;
  type: string;
  value: number;
  maxUses: number;
  usedCount: number;
  active: boolean;
  expiresAt: string | null;
};

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [code, setCode] = useState("");
  const [type, setType] = useState("free_days");
  const [value, setValue] = useState("7");

  function load() {
    api<{ coupons: Coupon[] }>("/v1/admin/coupons").then((r) => setCoupons(r.coupons));
  }

  useEffect(() => {
    load();
  }, []);

  async function create(e: FormEvent) {
    e.preventDefault();
    await api("/v1/admin/coupons", {
      method: "POST",
      body: JSON.stringify({
        code,
        type,
        value: Number(value),
        maxUses: 0,
        active: true,
      }),
    });
    setCode("");
    load();
  }

  async function toggle(c: Coupon) {
    await api("/v1/admin/coupons", {
      method: "PATCH",
      body: JSON.stringify({ id: c.id, active: !c.active }),
    });
    load();
  }

  return (
    <AdminShell>
      <h2 className="text-2xl font-semibold">Coupons</h2>
      <form onSubmit={create} className="mt-4 flex flex-wrap gap-2">
        <input
          className="rounded-lg border border-[#2a4558] bg-[#0a1219] px-3 py-2"
          placeholder="CODE"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
        />
        <select
          className="rounded-lg border border-[#2a4558] bg-[#0a1219] px-3 py-2"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="free_days">free_days</option>
          <option value="percent">percent</option>
          <option value="fixed">fixed</option>
        </select>
        <input
          className="w-24 rounded-lg border border-[#2a4558] bg-[#0a1219] px-3 py-2"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          required
        />
        <button className="rounded-lg bg-[#2dd4bf] px-4 py-2 font-semibold text-[#042f2e]">
          Add coupon
        </button>
      </form>
      <ul className="mt-6 space-y-2">
        {coupons.map((c) => (
          <li
            key={c.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#2a4558] bg-[#12202b] px-4 py-3"
          >
            <div>
              <p className="font-mono text-[#2dd4bf]">{c.code}</p>
              <p className="text-xs text-[#7a96a8]">
                {c.type}={c.value} · used {c.usedCount}
                {c.maxUses ? `/${c.maxUses}` : ""} · {c.active ? "active" : "off"}
              </p>
            </div>
            <button className="rounded bg-[#2a4558] px-3 py-1 text-xs" onClick={() => toggle(c)}>
              {c.active ? "Disable" : "Enable"}
            </button>
          </li>
        ))}
      </ul>
    </AdminShell>
  );
}

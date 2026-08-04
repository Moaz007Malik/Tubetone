"use client";

import { FormEvent, useEffect, useState } from "react";
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
    <>
      <header>
        <h2 className="page-title">Coupons</h2>
        <p className="page-sub">Promo codes for free days, percent off, or fixed value.</p>
      </header>

      <form onSubmit={create} className="toolbar mt-5">
        <input
          className="field max-w-[10rem] uppercase"
          placeholder="CODE"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
        />
        <select className="field w-auto" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="free_days">free_days</option>
          <option value="percent">percent</option>
          <option value="fixed">fixed</option>
        </select>
        <input
          className="field w-24"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          required
        />
        <button type="submit" className="btn btn-primary">
          Add coupon
        </button>
      </form>

      <ul className="mt-6 space-y-2">
        {coupons.length === 0 ? (
          <li className="text-sm text-[var(--muted)]">No coupons yet.</li>
        ) : (
          coupons.map((c) => (
            <li
              key={c.id}
              className="panel flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div>
                <p className="mono text-[var(--accent)]">{c.code}</p>
                <p className="mt-0.5 text-xs text-[var(--muted)]">
                  {c.type}={c.value} · used {c.usedCount}
                  {c.maxUses ? `/${c.maxUses}` : ""} · {c.active ? "active" : "off"}
                </p>
              </div>
              <button type="button" className="btn btn-muted btn-sm" onClick={() => toggle(c)}>
                {c.active ? "Disable" : "Enable"}
              </button>
            </li>
          ))
        )}
      </ul>
    </>
  );
}

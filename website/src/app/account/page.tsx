"use client";

import { FormEvent, useState } from "react";
import { api } from "@/lib/api";

type Account = {
  email: string;
  licenseKey: string;
  plan: string;
  status: string;
  valid: boolean;
  reason: string | null;
  endsAt: string;
  devices: Array<{ machineName: string | null; lastSeenAt: string }>;
};

export default function AccountPage() {
  const [email, setEmail] = useState("");
  const [key, setKey] = useState("");
  const [data, setData] = useState<Account | null>(null);
  const [error, setError] = useState("");

  async function lookup(e: FormEvent) {
    e.preventDefault();
    setError("");
    setData(null);
    try {
      const res = await api<Account>("/v1/account/lookup", {
        method: "POST",
        body: JSON.stringify({ email, key }),
      });
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <main className="sans mx-auto max-w-3xl px-5 py-16">
      <h1 className="font-[family-name:var(--font-display)] text-4xl text-[#2dd4bf]">Account</h1>
      <form onSubmit={lookup} className="mt-6 space-y-3 rounded-2xl border border-[#2a4558] bg-[#12202b] p-6">
        <input
          className="w-full rounded-lg border border-[#2a4558] bg-[#0a1219] px-3 py-2"
          placeholder="Email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="w-full rounded-lg border border-[#2a4558] bg-[#0a1219] px-3 py-2"
          placeholder="License key"
          required
          value={key}
          onChange={(e) => setKey(e.target.value)}
        />
        <button className="rounded-lg bg-[#2dd4bf] px-4 py-2 font-semibold text-[#042f2e]">
          Check status
        </button>
      </form>
      {error ? <p className="mt-4 text-red-400">{error}</p> : null}
      {data ? (
        <div className="mt-6 rounded-2xl border border-[#2a4558] bg-[#12202b] p-6">
          <p>
            Status:{" "}
            <strong className={data.valid ? "text-emerald-400" : "text-red-400"}>
              {data.valid ? "Active" : data.reason || data.status}
            </strong>
          </p>
          <p className="mt-2 text-sm text-[#7a96a8]">
            Plan {data.plan} · ends {new Date(data.endsAt).toLocaleString()}
          </p>
          <ul className="mt-4 space-y-1 text-sm">
            {data.devices.map((d, i) => (
              <li key={i}>
                {d.machineName || "Device"} · last seen {new Date(d.lastSeenAt).toLocaleString()}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </main>
  );
}

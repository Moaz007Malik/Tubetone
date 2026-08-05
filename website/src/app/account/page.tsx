"use client";

import { FormEvent, useState } from "react";
import { api } from "@/lib/api";
import { Field, PageHero, PageShell } from "@/components/PageShell";

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
    <PageShell>
      <PageHero kicker="License" title="Account" lead="Look up plan status with your email and key." />
      <form onSubmit={lookup} className="surface space-y-3">
        <Field
          placeholder="Email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Field
          placeholder="License key"
          required
          value={key}
          onChange={(e) => setKey(e.target.value)}
        />
        <button type="submit" className="btn-primary">
          Check status
        </button>
      </form>
      {error ? <p className="mt-4 text-sm text-[var(--danger)]">{error}</p> : null}
      {data ? (
        <div className="surface mt-6">
          <span className="status-chip">{data.valid ? "Active" : data.reason || data.status}</span>
          <p className="mt-4 text-sm text-[var(--muted)]">
            Plan {data.plan} · ends {new Date(data.endsAt).toLocaleString()}
          </p>
          <ul className="mt-4 space-y-2 text-sm text-[var(--muted)]">
            {data.devices.map((d, i) => (
              <li key={i} className="step-row !py-3">
                {d.machineName || "Device"} · last seen {new Date(d.lastSeenAt).toLocaleString()}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </PageShell>
  );
}

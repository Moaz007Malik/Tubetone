"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { api } from "@/lib/api";

type License = {
  id: string;
  key: string;
  status: string;
  devices: Array<{ machineName: string | null; lastSeenAt: string }>;
  subscription: {
    plan: string;
    status: string;
    endsAt: string;
    user: { email: string };
  };
};

export default function LicensesPage() {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState("");
  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState("monthly");

  const load = useCallback(() => {
    const qs = q ? `?q=${encodeURIComponent(q)}` : "";
    api<{ licenses: License[] }>(`/v1/admin/licenses${qs}`).then((r) =>
      setLicenses(r.licenses)
    );
  }, [q]);

  useEffect(() => {
    load();
  }, [load]);

  async function act(id: string, action: string, days?: number) {
    setMsg("");
    await api("/v1/admin/licenses", {
      method: "PATCH",
      body: JSON.stringify({ id, action, days }),
    });
    setMsg(`${action} ok`);
    load();
  }

  async function issue(e: FormEvent) {
    e.preventDefault();
    const res = await api<{ licenseKey: string }>("/v1/admin/licenses", {
      method: "POST",
      body: JSON.stringify({ email, plan }),
    });
    setMsg(`Issued ${res.licenseKey}`);
    setEmail("");
    load();
  }

  return (
    <AdminShell>
      <h2 className="text-2xl font-semibold">Licenses</h2>
      <form onSubmit={issue} className="mt-4 flex flex-wrap gap-2">
        <input
          className="rounded-lg border border-[#2a4558] bg-[#0a1219] px-3 py-2"
          placeholder="email@…"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <select
          className="rounded-lg border border-[#2a4558] bg-[#0a1219] px-3 py-2"
          value={plan}
          onChange={(e) => setPlan(e.target.value)}
        >
          <option value="trial">trial</option>
          <option value="monthly">monthly</option>
          <option value="yearly">yearly</option>
        </select>
        <button className="rounded-lg bg-[#2dd4bf] px-4 py-2 font-semibold text-[#042f2e]">
          Issue license
        </button>
      </form>
      <div className="mt-4 flex gap-2">
        <input
          className="rounded-lg border border-[#2a4558] bg-[#0a1219] px-3 py-2"
          placeholder="Search email or key"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button className="rounded-lg bg-[#2a4558] px-3 py-2" onClick={load}>
          Search
        </button>
      </div>
      {msg ? <p className="mt-3 text-sm text-emerald-400">{msg}</p> : null}
      <div className="mt-6 space-y-3">
        {licenses.map((l) => (
          <div key={l.id} className="rounded-xl border border-[#2a4558] bg-[#12202b] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-mono text-[#2dd4bf]">{l.key}</p>
                <p className="text-sm text-[#7a96a8]">
                  {l.subscription.user.email} · {l.subscription.plan} · ends{" "}
                  {new Date(l.subscription.endsAt).toLocaleDateString()}
                </p>
                <p className="text-xs uppercase text-[#7a96a8]">
                  license {l.status} / sub {l.subscription.status} · {l.devices.length} device(s)
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  className="rounded bg-red-900/60 px-2 py-1 text-xs"
                  onClick={() => act(l.id, "revoke")}
                >
                  Revoke
                </button>
                <button
                  className="rounded bg-[#2a4558] px-2 py-1 text-xs"
                  onClick={() => act(l.id, "reinstate")}
                >
                  Reinstate
                </button>
                <button
                  className="rounded bg-[#2a4558] px-2 py-1 text-xs"
                  onClick={() => act(l.id, "extend", 30)}
                >
                  +30 days
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </AdminShell>
  );
}

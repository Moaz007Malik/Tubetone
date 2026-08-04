"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { statusClass } from "@/lib/ui";

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
    api<{ licenses: License[] }>(`/v1/admin/licenses${qs}`).then((r) => setLicenses(r.licenses));
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
    <>
      <header>
        <h2 className="page-title">Licenses</h2>
        <p className="page-sub">Issue, revoke, reinstate, or extend subscription keys.</p>
      </header>

      <form onSubmit={issue} className="toolbar mt-5">
        <input
          className="field max-w-xs"
          placeholder="Customer email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          type="email"
          autoComplete="off"
        />
        <select className="field w-auto" value={plan} onChange={(e) => setPlan(e.target.value)}>
          <option value="trial">trial</option>
          <option value="monthly">monthly</option>
          <option value="yearly">yearly</option>
        </select>
        <button type="submit" className="btn btn-primary">
          Issue license
        </button>
      </form>

      <div className="toolbar mt-3">
        <input
          className="field max-w-xs"
          placeholder="Search email or key"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button type="button" className="btn btn-ghost" onClick={load}>
          Search
        </button>
      </div>

      {msg ? <p className="alert-ok">{msg}</p> : null}

      <div className="mt-6 space-y-3">
        {licenses.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No licenses found.</p>
        ) : (
          licenses.map((l) => (
            <div key={l.id} className="panel p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="mono break-all text-[var(--accent)]">{l.key}</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {l.subscription.user.email} ·{" "}
                    <span className="capitalize">{l.subscription.plan}</span> · ends{" "}
                    {new Date(l.subscription.endsAt).toLocaleDateString()}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className={statusClass(l.status)}>license {l.status}</span>
                    <span className={statusClass(l.subscription.status)}>
                      sub {l.subscription.status}
                    </span>
                    <span className="badge badge-muted">{l.devices.length} device(s)</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => act(l.id, "revoke")}
                  >
                    Revoke
                  </button>
                  <button
                    type="button"
                    className="btn btn-muted btn-sm"
                    onClick={() => act(l.id, "reinstate")}
                  >
                    Reinstate
                  </button>
                  <button
                    type="button"
                    className="btn btn-muted btn-sm"
                    onClick={() => act(l.id, "extend", 30)}
                  >
                    +30 days
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}

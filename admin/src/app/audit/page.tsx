"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { api } from "@/lib/api";

type Log = {
  id: string;
  adminId: string | null;
  action: string;
  meta: unknown;
  createdAt: string;
};

export default function AuditPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [action, setAction] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(() => {
    const qs = action ? `?action=${encodeURIComponent(action)}` : "";
    api<{ logs: Log[] }>(`/v1/admin/audit${qs}`)
      .then((r) => setLogs(r.logs))
      .catch((e) => setError(e.message));
  }, [action]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <AdminShell>
      <h2 className="text-2xl font-semibold">Audit log</h2>
      <p className="mt-1 text-sm text-[#7a96a8]">
        Admin actions, license changes, and email delivery attempts.
      </p>
      <div className="mt-4 flex gap-2">
        <input
          className="rounded-lg border border-[#2a4558] bg-[#0a1219] px-3 py-2"
          placeholder="Filter action (e.g. revoke, email)"
          value={action}
          onChange={(e) => setAction(e.target.value)}
        />
        <button className="rounded-lg bg-[#2a4558] px-3 py-2" onClick={load}>
          Refresh
        </button>
      </div>
      {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
      <ul className="mt-6 space-y-2">
        {logs.length === 0 ? (
          <li className="text-sm text-[#7a96a8]">No audit entries yet.</li>
        ) : (
          logs.map((l) => (
            <li
              key={l.id}
              className="rounded-xl border border-[#2a4558] bg-[#12202b] px-4 py-3 text-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-[#2dd4bf]">{l.action}</span>
                <span className="text-xs text-[#7a96a8]">
                  {new Date(l.createdAt).toLocaleString()}
                </span>
              </div>
              {l.meta != null ? (
                <pre className="mt-2 overflow-x-auto text-xs text-[#7a96a8]">
                  {JSON.stringify(l.meta, null, 2)}
                </pre>
              ) : null}
            </li>
          ))
        )}
      </ul>
    </AdminShell>
  );
}

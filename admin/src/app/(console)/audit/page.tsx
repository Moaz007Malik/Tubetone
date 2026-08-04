"use client";

import { useCallback, useEffect, useState } from "react";
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
    <>
      <header>
        <h2 className="page-title">Audit log</h2>
        <p className="page-sub">Admin actions, license changes, and email delivery attempts.</p>
      </header>

      <div className="toolbar mt-5">
        <input
          className="field max-w-xs"
          placeholder="Filter action (e.g. revoke, email)"
          value={action}
          onChange={(e) => setAction(e.target.value)}
        />
        <button type="button" className="btn btn-ghost" onClick={load}>
          Refresh
        </button>
      </div>

      {error ? <p className="alert-err">{error}</p> : null}

      <ul className="mt-6 space-y-2">
        {logs.length === 0 ? (
          <li className="text-sm text-[var(--muted)]">No audit entries yet.</li>
        ) : (
          logs.map((l) => (
            <li key={l.id} className="panel px-4 py-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="mono text-[var(--accent)]">{l.action}</span>
                <span className="text-xs text-[var(--muted)]">
                  {new Date(l.createdAt).toLocaleString()}
                </span>
              </div>
              {l.meta != null ? (
                <pre className="mono mt-2 overflow-x-auto text-xs text-[var(--muted)]">
                  {JSON.stringify(l.meta, null, 2)}
                </pre>
              ) : null}
            </li>
          ))
        )}
      </ul>
    </>
  );
}

"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { statusClass } from "@/lib/ui";

type User = {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
  subscriptions: Array<{
    plan: string;
    status: string;
    endsAt: string;
    licenses: Array<{ key: string }>;
  }>;
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [q, setQ] = useState("");

  function load() {
    const qs = q ? `?q=${encodeURIComponent(q)}` : "";
    api<{ users: User[] }>(`/v1/admin/users${qs}`).then((r) => setUsers(r.users));
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <>
      <header>
        <h2 className="page-title">Users</h2>
        <p className="page-sub">Accounts and their current subscriptions.</p>
      </header>

      <div className="toolbar mt-5">
        <input
          className="field max-w-xs"
          placeholder="Search email"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button type="button" className="btn btn-ghost" onClick={load}>
          Search
        </button>
      </div>

      <ul className="mt-6 space-y-2">
        {users.length === 0 ? (
          <li className="text-sm text-[var(--muted)]">No users found.</li>
        ) : (
          users.map((u) => (
            <li key={u.id} className="panel px-4 py-3">
              <p className="font-medium">{u.email}</p>
              {u.subscriptions[0] ? (
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
                  <span className="capitalize">{u.subscriptions[0].plan}</span>
                  <span className={statusClass(u.subscriptions[0].status)}>
                    {u.subscriptions[0].status}
                  </span>
                  <span className="mono">{u.subscriptions[0].licenses[0]?.key || "no key"}</span>
                </div>
              ) : (
                <p className="mt-1 text-xs text-[var(--muted)]">No subscription</p>
              )}
            </li>
          ))
        )}
      </ul>
    </>
  );
}

"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { api } from "@/lib/api";

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
    <AdminShell>
      <h2 className="text-2xl font-semibold">Users</h2>
      <div className="mt-4 flex gap-2">
        <input
          className="rounded-lg border border-[#2a4558] bg-[#0a1219] px-3 py-2"
          placeholder="Search email"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button className="rounded-lg bg-[#2a4558] px-3 py-2" onClick={load}>
          Search
        </button>
      </div>
      <ul className="mt-6 space-y-2">
        {users.map((u) => (
          <li key={u.id} className="rounded-xl border border-[#2a4558] bg-[#12202b] px-4 py-3">
            <p className="font-medium">{u.email}</p>
            <p className="text-xs text-[#7a96a8]">
              {u.subscriptions[0]
                ? `${u.subscriptions[0].plan} · ${u.subscriptions[0].status} · ${u.subscriptions[0].licenses[0]?.key || "no key"}`
                : "No subscription"}
            </p>
          </li>
        ))}
      </ul>
    </AdminShell>
  );
}

"use client";

import { FormEvent, useEffect, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { api, API } from "@/lib/api";

export default function SettingsPage() {
  const [jsonText, setJsonText] = useState("{}");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    api<{ config: unknown }>("/v1/admin/settings").then((r) => {
      setJsonText(JSON.stringify(r.config, null, 2));
    });
  }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    setMsg("");
    try {
      const body = JSON.parse(jsonText);
      await api("/v1/admin/settings", { method: "PUT", body: JSON.stringify(body) });
      setMsg("Saved");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <AdminShell>
      <h2 className="text-2xl font-semibold">Settings</h2>
      <p className="mt-1 text-sm text-[#7a96a8]">API: {API}</p>
      <form onSubmit={save} className="mt-4">
        <textarea
          className="h-64 w-full rounded-xl border border-[#2a4558] bg-[#0a1219] p-3 font-mono text-xs"
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
        />
        <button className="mt-3 rounded-lg bg-[#2dd4bf] px-4 py-2 font-semibold text-[#042f2e]">
          Save config
        </button>
      </form>
      {msg ? <p className="mt-3 text-sm text-emerald-400">{msg}</p> : null}
    </AdminShell>
  );
}

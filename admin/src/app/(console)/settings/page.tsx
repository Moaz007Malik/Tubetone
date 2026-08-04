"use client";

import { FormEvent, useEffect, useState } from "react";
import { api, API } from "@/lib/api";

export default function SettingsPage() {
  const [jsonText, setJsonText] = useState("{}");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ config: unknown }>("/v1/admin/settings")
      .then((r) => {
        setJsonText(JSON.stringify(r.config, null, 2));
      })
      .catch((e) => setError(e.message));
  }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    setMsg("");
    setError("");
    try {
      const body = JSON.parse(jsonText);
      await api("/v1/admin/settings", { method: "PUT", body: JSON.stringify(body) });
      setMsg("Saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <>
      <header>
        <h2 className="page-title">Settings</h2>
        <p className="page-sub">App config JSON served to the product surface.</p>
      </header>

      <p className="mt-4 text-xs text-[var(--muted)]">
        API: <span className="mono text-[var(--text)]">{API || "(not set)"}</span>
      </p>

      <form onSubmit={save} className="mt-4">
        <textarea
          className="field mono h-72 text-xs leading-relaxed"
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          spellCheck={false}
        />
        <button type="submit" className="btn btn-primary mt-3">
          Save config
        </button>
      </form>

      {msg ? <p className="alert-ok">{msg}</p> : null}
      {error ? <p className="alert-err">{error}</p> : null}
    </>
  );
}

"use client";

import { useState } from "react";
import { Panel } from "./ui";

export function LoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      const next = new URLSearchParams(window.location.search).get("next");
      // Only follow local paths.
      window.location.href = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
      return;
    }
    setError((await res.json().catch(() => ({}))).error ?? "Login failed.");
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="mx-auto mt-10 max-w-sm space-y-4">
      <h1 className="text-2xl font-bold">Log in</h1>
      <input
        type="password"
        autoFocus
        autoComplete="current-password"
        aria-label="Password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full rounded-lg border border-slate-300 bg-surface px-3 py-2.5"
      />
      {error && <Panel tone="danger" title={error}>Ask your administrator for the password.</Panel>}
      <button
        type="submit"
        disabled={busy || !password}
        className="w-full rounded-lg bg-accent px-4 py-2.5 font-semibold text-white disabled:opacity-50"
      >
        {busy ? "Checking…" : "Log in"}
      </button>
    </form>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { KNOWN_NAME_KINDS, KNOWN_NAME_KIND_LABELS, defaultReplacement, type KnownName, type KnownNameKind } from "@/lib/known-names";
import { Panel } from "./ui";

export function KnownNamesEditor() {
  const [names, setNames] = useState<KnownName[] | null>(null);
  const [term, setTerm] = useState("");
  const [kind, setKind] = useState<KnownNameKind>("company");
  const [replacement, setReplacement] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/known-names")
      .then((r) => r.json())
      .then((d) => setNames(d.names))
      .catch((e) => setError(String(e)));
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/known-names", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ term, kind, replacement }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not add the name.");
      setNames((ns) => [...(ns ?? []), data.name].sort((a, b) => a.term.localeCompare(b.term)));
      setTerm("");
      setReplacement("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove(n: KnownName) {
    if (!confirm(`Remove “${n.term}” from the list?`)) return;
    const res = await fetch(`/api/known-names/${n.id}`, { method: "DELETE" });
    if (res.ok) setNames((ns) => (ns ?? []).filter((x) => x.id !== n.id));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Names list</h1>
        <p className="mt-1 text-muted">
          Company, contractor, supplier, people and place names that must never reach a video. They are removed on
          this server <b>before</b> anything is sent to Claude, and every storyboard is checked for them before it
          renders. Add the names that come up often (your company, regular contractors, field and rig names).
        </p>
      </div>

      <form onSubmit={add} className="grid gap-3 rounded-xl border border-slate-200 bg-surface p-4 sm:grid-cols-[2fr_1.4fr_1.6fr_auto] sm:items-end">
        <label className="text-sm">
          <span className="mb-1 block font-semibold">Name</span>
          <input dir="auto" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="e.g. Falcon Logistics"
            className="w-full rounded-md border border-slate-300 px-3 py-2" />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-semibold">Type</span>
          <select value={kind} onChange={(e) => setKind(e.target.value as KnownNameKind)}
            className="w-full rounded-md border border-slate-300 bg-white px-2 py-2">
            {KNOWN_NAME_KINDS.map((k) => (
              <option key={k} value={k}>{KNOWN_NAME_KIND_LABELS[k]}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-semibold">Replace with</span>
          <input dir="auto" value={replacement} onChange={(e) => setReplacement(e.target.value)}
            placeholder={defaultReplacement(kind, term)} className="w-full rounded-md border border-slate-300 px-3 py-2" />
        </label>
        <button type="submit" disabled={busy || term.trim().length < 2}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-accent px-4 py-2 font-semibold text-white disabled:opacity-50">
          <Plus size={16} /> Add
        </button>
      </form>

      {error && <Panel tone="danger" title="Problem">{error}</Panel>}

      {names === null ? (
        <p className="text-muted">Loading…</p>
      ) : names.length === 0 ? (
        <p className="text-muted">The list is empty. ID numbers, emails, phone numbers and GPS positions are removed automatically even without it.</p>
      ) : (
        <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-surface">
          {names.map((n) => (
            <li key={n.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
              <span dir="auto" className="font-semibold">{n.term}</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-muted">{KNOWN_NAME_KIND_LABELS[n.kind].split(" (")[0]}</span>
              <span dir="auto" className="text-sm text-muted">→ {n.replacement}</span>
              <button type="button" onClick={() => remove(n)} aria-label={`Remove ${n.term}`} title="Remove"
                className="ml-auto rounded-md p-1.5 text-danger hover:bg-red-50">
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

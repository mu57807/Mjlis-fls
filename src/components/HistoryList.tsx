"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import type { ProjectSummary } from "@/lib/schema";
import { LANGUAGE_LABEL, Panel, StatusPill } from "./ui";

export function HistoryList() {
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((d) => setProjects(d.projects))
      .catch((e) => setError(String(e)));
  }, []);

  async function remove(p: ProjectSummary) {
    if (!confirm(`Delete "${p.title}" (${LANGUAGE_LABEL[p.language]})? This cannot be undone.`)) return;
    const res = await fetch(`/api/projects/${p.id}`, { method: "DELETE" });
    if (res.ok) setProjects((cur) => cur?.filter((x) => x.id !== p.id) ?? null);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center">
        <h1 className="text-2xl font-bold">History</h1>
        <Link
          href="/"
          className="ml-auto rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:brightness-110"
        >
          + New LFI
        </Link>
      </div>
      {error && <Panel tone="danger" title="Could not load history">{error}</Panel>}
      {projects === null && !error && <p className="text-muted">Loading…</p>}
      {projects?.length === 0 && (
        <p className="text-muted">No storyboards yet. Create your first one from the New LFI page.</p>
      )}
      <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-surface">
        {projects?.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <Link
                href={`/projects/${p.id}`}
                dir="auto"
                className="block truncate font-semibold hover:underline"
              >
                {p.title}
              </Link>
              <div className="mt-0.5 text-xs text-muted">
                {new Date(p.createdAt).toLocaleString()} · <bdi>{LANGUAGE_LABEL[p.language]}</bdi> ·{" "}
                {p.aspectRatio} · {p.targetSeconds}s · {p.sceneCount} scenes{p.demo ? " · demo" : ""}
              </div>
            </div>
            <StatusPill status={p.status} />
            <button
              type="button"
              aria-label="Delete"
              title="Delete"
              onClick={() => remove(p)}
              className="rounded-md p-1.5 text-muted hover:bg-red-50 hover:text-danger"
            >
              <Trash2 size={16} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

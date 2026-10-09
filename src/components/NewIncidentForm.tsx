"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SAMPLE_INCIDENTS } from "@/samples/incidents";
import { Choice, Panel } from "./ui";

type OutputLanguage = "en" | "ar" | "both";

export function NewIncidentForm({ demoMode }: { demoMode: boolean }) {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [outputLanguage, setOutputLanguage] = useState<OutputLanguage>("en");
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "9:16">("16:9");
  const [targetSeconds, setTargetSeconds] = useState<60 | 90>(60);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/storyboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, outputLanguage, aspectRatio, targetSeconds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      router.push(`/projects/${data.projectIds[0]}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">New Learning From Incident video</h1>
        <p className="mt-1 text-muted">
          Paste the incident description below (Arabic or English). Claude will turn it into a
          storyboard that you review and approve before any video is made.
        </p>
      </div>

      {demoMode && (
        <Panel tone="info" title="Demo mode is on">
          No Claude API key is used. Only the two sample incidents below will work, and they return
          pre-written storyboards. To use your own incidents, add a Claude API key and set{" "}
          <code>LFI_DEMO_MODE=false</code> in <code>.env.local</code>.
        </Panel>
      )}

      <div>
        <div className="mb-1.5 flex flex-wrap items-center gap-2">
          <label htmlFor="desc" className="text-sm font-semibold">
            Incident description
          </label>
          <span className="ml-auto text-xs text-muted">Load a sample:</span>
          {SAMPLE_INCIDENTS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setDescription(s.text)}
              className="rounded border border-slate-300 bg-surface px-2 py-1 text-xs hover:border-brand"
            >
              {s.label}
            </button>
          ))}
        </div>
        <textarea
          id="desc"
          dir="auto"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={12}
          placeholder="What happened, where in the job, why it happened, injuries or near miss, what was learned…"
          className="w-full rounded-xl border border-slate-300 bg-surface p-3 shadow-sm focus:border-brand focus:outline-none"
        />
        <p className="mt-1 text-xs text-muted">
          Names of people, contractors, locations and ID numbers will be removed automatically. You
          will still be asked to check before approving. {description.length.toLocaleString()} characters.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <Choice
          label="Output language"
          value={outputLanguage}
          onChange={setOutputLanguage}
          options={[
            { value: "en", label: "English" },
            { value: "ar", label: "العربية" },
            { value: "both", label: "Both", hint: "Two separate videos" },
          ]}
        />
        <Choice
          label="Format"
          value={aspectRatio}
          onChange={setAspectRatio}
          options={[
            { value: "16:9", label: "16:9", hint: "Screens, TV, PowerPoint" },
            { value: "9:16", label: "9:16", hint: "WhatsApp, mobile" },
          ]}
        />
        <Choice
          label="Length"
          value={targetSeconds}
          onChange={setTargetSeconds}
          options={[
            { value: 60, label: "60 seconds" },
            { value: 90, label: "90 seconds" },
          ]}
        />
      </div>

      {error && (
        <Panel tone="danger" title="Could not create the storyboard">
          {error}
        </Panel>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={busy || description.trim().length < 40}
          className="rounded-lg bg-accent px-5 py-2.5 font-semibold text-white shadow hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Creating storyboard…" : "Create storyboard"}
        </button>
        {busy && (
          <span className="text-sm text-muted">
            Claude is reading the incident. This usually takes 20–60 seconds
            {outputLanguage === "both" ? " (two languages are written in parallel)" : ""}.
          </span>
        )}
      </div>
    </form>
  );
}

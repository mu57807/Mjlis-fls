"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { CheckCircle2, Clapperboard, Plus, Save, ShieldAlert, ShieldCheck, Wand2 } from "lucide-react";
import type { ComplianceIssue } from "@/lib/compliance";
import type { Facts } from "@/lib/schema";
import type { Project, Scene, Storyboard } from "@/lib/schema";
import { checkStoryboard, fitDurations } from "@/lib/storyboard-checks";
import { Choice, LANGUAGE_LABEL, OriginBadge, Panel, StatusPill } from "../ui";
import { SceneCard } from "./SceneCard";
import { ListEditor } from "./ListEditor";
import { RenderPanel } from "./RenderPanel";

// The video player only runs in the browser.
const VideoPreview = dynamic(() => import("./VideoPreview"), {
  ssr: false,
  loading: () => <div className="aspect-video w-full animate-pulse rounded-xl bg-slate-200" />,
});

interface Sibling {
  id: string;
  language: Project["language"];
}

export function ReviewEditor({ id }: { id: string }) {
  const [project, setProject] = useState<Project | null>(null);
  const [siblings, setSiblings] = useState<Sibling[]>([]);
  const [sb, setSb] = useState<Storyboard | null>(null);
  const [aspectRatio, setAspectRatio] = useState<Project["aspectRatio"]>("16:9");
  const [targetSeconds, setTargetSeconds] = useState<60 | 90>(60);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<null | "save" | "approve" | "render" | "voiceover">(null);
  const [ttsProvider, setTtsProvider] = useState("none");
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  // Automatic part of the final check, re-run while editing.
  const [ruleIssues, setRuleIssues] = useState<ComplianceIssue[]>([]);
  const [checkRun, setCheckRun] = useState(0);

  const applyProject = useCallback((p: Project) => {
    setProject(p);
    setSb(p.storyboard);
    setAspectRatio(p.aspectRatio);
    setTargetSeconds(p.targetSeconds);
    setDirty(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/projects/${id}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Could not load the project.");
        if (cancelled) return;
        applyProject(data.project);
        setSiblings(data.siblings);
        setTtsProvider(data.tts);
      })
      .catch((err) => !cancelled && setLoadError(String(err.message ?? err)));
    return () => {
      cancelled = true;
    };
  }, [id, applyProject]);

  // Warn before closing the tab with unsaved edits.
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  // While rendering, poll for progress (without touching unsaved edits).
  const rendering = project?.status === "rendering";
  useEffect(() => {
    if (!rendering) return;
    const timer = setInterval(async () => {
      const res = await fetch(`/api/projects/${id}`);
      if (res.ok) setProject((await res.json()).project);
    }, 1500);
    return () => clearInterval(timer);
  }, [rendering, id]);

  const checkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!sb) return;
    if (checkTimer.current) clearTimeout(checkTimer.current);
    checkTimer.current = setTimeout(async () => {
      const res = await fetch(`/api/projects/${id}/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storyboard: sb }),
      });
      if (res.ok) setRuleIssues((await res.json()).issues);
    }, 500);
  }, [sb, id, checkRun]);

  const report = useMemo(
    () => (sb && project ? checkStoryboard(sb, targetSeconds, project.sourceText) : null),
    [sb, project, targetSeconds],
  );

  if (loadError) {
    return (
      <Panel tone="danger" title="Could not open this storyboard">
        {loadError} <Link href="/history" className="underline">Back to history</Link>
      </Panel>
    );
  }
  if (!project || !sb || !report) return <p className="text-muted">Loading storyboard…</p>;

  const lang = project.language;
  const dir = lang === "ar" ? "rtl" : "ltr";

  function update(patch: Partial<Storyboard>) {
    setSb((cur) => (cur ? { ...cur, ...patch } : cur));
    setDirty(true);
  }
  function updateScene(sceneId: string, patch: Partial<Scene>) {
    update({ scenes: sb!.scenes.map((s) => (s.id === sceneId ? { ...s, ...patch } : s)) });
  }
  function moveScene(from: number, to: number) {
    if (to < 0 || to >= sb!.scenes.length || from === to) return;
    const scenes = [...sb!.scenes];
    const [moved] = scenes.splice(from, 1);
    scenes.splice(to, 0, moved);
    update({ scenes });
  }
  function addScene() {
    const scenes = [...sb!.scenes];
    const newScene: Scene = {
      id: crypto.randomUUID(),
      visual_type: "what_happened",
      narration: "",
      caption: "",
      icons: [],
      images: [],
      duration_seconds: 8,
    };
    // Insert before the closing card, if there is one at the end.
    const at = scenes.at(-1)?.visual_type === "closing_card" ? scenes.length - 1 : scenes.length;
    scenes.splice(at, 0, newScene);
    update({ scenes });
  }

  async function save(): Promise<boolean> {
    setBusy("save");
    setError(null);
    try {
      const cleaned: Storyboard = {
        ...sb!,
        why_it_happened: sb!.why_it_happened.map((s) => s.trim()).filter(Boolean),
        actions: sb!.actions.map((s) => s.trim()).filter(Boolean),
      };
      const res = await fetch(`/api/projects/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storyboard: cleaned, aspectRatio, targetSeconds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save.");
      applyProject(data.project);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function approve() {
    if (report!.identifiers.length > 0) {
      const ok = confirm(
        `${report!.identifiers.length} possible identifying detail(s) are flagged in red. Have you checked them? Click OK to approve anyway.`,
      );
      if (!ok) return;
    }
    if (dirty && !(await save())) return;
    setBusy("approve");
    setError(null);
    try {
      const res = await fetch(`/api/projects/${id}/approve`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not approve.");
      applyProject(data.project);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  async function render() {
    setBusy("render");
    setError(null);
    try {
      const res = await fetch(`/api/projects/${id}/render`, { method: "POST" });
      const data = await res.json();
      if (res.status === 409 && data.check) {
        setProject(data.project);
        setRuleIssues(data.check.issues.filter((i: ComplianceIssue) => i.source !== "ai"));
        document.getElementById("final-check")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      if (!res.ok) throw new Error(data.error || "Could not start the render.");
      setProject(data.project);
      document.getElementById("video")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  async function voiceover() {
    setBusy("voiceover");
    setError(null);
    try {
      const res = await fetch(`/api/projects/${id}/voiceover`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not generate the voiceover.");
      setProject(data.project);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  async function acknowledge(keys: string[]) {
    const res = await fetch(`/api/projects/${id}/acknowledge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keys }),
    });
    if (res.ok) {
      setProject((await res.json()).project);
      setCheckRun((n) => n + 1);
    }
  }

  // Problems that block the render: the automatic checks (live) plus Claude's
  // findings from the last final check, minus confirmed false alarms.
  const acked = new Set(project.compliance.acknowledged);
  const aiIssues = (project.compliance.lastCheck?.issues ?? []).filter(
    (i) => i.source === "ai" && !acked.has(i.key),
  );
  // One line per word and place, even when several checks found it.
  const grouped = new Map<string, ComplianceIssue & { keys: string[] }>();
  for (const i of [...ruleIssues, ...aiIssues]) {
    const k = `${i.text.toLowerCase()}|${i.where}`;
    const g = grouped.get(k);
    if (!g) grouped.set(k, { ...i, keys: [i.key] });
    else {
      g.keys.push(i.key);
      g.overridable = g.overridable && i.overridable;
      if (!g.reason.includes(i.reason)) g.reason += `; ${i.reason}`;
    }
  }
  const blockingIssues = [...grouped.values()];
  const sceneProblems = (sceneId: string) => blockingIssues.filter((i) => i.sceneId === sceneId);

  const sceneWarnings = (sceneId: string) =>
    report.warnings.filter((w) => w.sceneId === sceneId).map((w) => w.message);
  const generalWarnings = report.warnings.filter((w) => !w.sceneId);
  const approved = !!project.approvedAt && !dirty;
  const canRender = approved && project.status !== "rendering";
  const durationOk = Math.abs(report.totalSeconds - targetSeconds) <= targetSeconds * 0.1;

  return (
    <div className="space-y-6 pb-28">
      {/* ---------- Header ---------- */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Link href="/history" className="text-muted hover:underline">
            ← History
          </Link>
          <span className="text-slate-300">|</span>
          <span className="font-semibold">Storyboard · {LANGUAGE_LABEL[lang]}</span>
          <StatusPill status={dirty ? "draft" : project.status} />
          <OriginBadge origin={project.origin} contact={project.originContact} />
          {project.demo && (
            <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-semibold text-sky-800">
              Demo storyboard
            </span>
          )}
          {siblings.map((s) => (
            <Link
              key={s.id}
              href={`/projects/${s.id}`}
              className="ml-auto rounded-md border border-slate-300 bg-surface px-2.5 py-1 hover:border-brand"
            >
              Open the {LANGUAGE_LABEL[s.language]} version →
            </Link>
          ))}
        </div>
        <input
          dir={dir}
          lang={lang}
          aria-label="Video title"
          value={sb.title}
          onChange={(e) => update({ title: e.target.value })}
          className={`w-full rounded-lg border px-2 py-1 text-2xl font-bold hover:border-slate-300 focus:border-brand focus:bg-surface focus:outline-none ${blockingIssues.some((i) => i.where === "Video title") ? "border-red-500 bg-red-50" : "border-transparent bg-transparent"}`}
        />
      </div>

      {/* ---------- Final check (APP RULES) ---------- */}
      <div id="final-check">
        {blockingIssues.length > 0 ? (
          <Panel
            tone="danger"
            title={
              <span className="inline-flex items-center gap-1.5">
                <ShieldAlert size={16} /> Rendering is blocked: {blockingIssues.length} problem(s) to fix
              </span>
            }
          >
            <p className="mb-2">
              Videos must never mention company names or incident / reference numbers, and flagged pictures must be
              checked. Edit the highlighted places (scenes are marked in red), then save and approve again.
            </p>
            <ul className="space-y-1.5">
              {blockingIssues.map((i) => (
                <li key={`${i.key}|${i.where}`} className="flex flex-wrap items-baseline gap-x-2">
                  <span>
                    <b dir="auto" className="bg-red-200 px-1">{i.text}</b> in <i>{i.where}</i>{" "}
                    <span className="text-muted">– {i.reason}</span>
                  </span>
                  {i.overridable && (
                    <button
                      type="button"
                      onClick={() => acknowledge(i.keys)}
                      className="rounded border border-red-300 bg-white px-2 py-0.5 text-xs hover:bg-red-100"
                    >
                      {i.kind === "image" ? "I checked: the picture is safe" : "Not a company name or ID"}
                    </button>
                  )}
                </li>
              ))}
            </ul>
            {project.compliance.lastCheck && (
              <p className="mt-2 text-xs text-muted">
                Last full check: {new Date(project.compliance.lastCheck.checkedAt).toLocaleString()}
                {project.compliance.lastCheck.aiChecked ? " (including Claude)" : " (automatic checks only)"}
              </p>
            )}
          </Panel>
        ) : (
          <Panel tone="neutral" title={<span className="inline-flex items-center gap-1.5"><ShieldCheck size={16} /> Final check</span>}>
            <p className="text-ok">
              No company names, incident IDs or unchecked pictures found. Claude reads everything once more when you
              click Render.
            </p>
          </Panel>
        )}
      </div>

      {/* ---------- Checks ---------- */}
      <div className="grid gap-4 md:grid-cols-2">
        {project.alertId ? null : report.identifiers.length > 0 ? (
          <Panel tone="danger" title={`Check these possible identifying details (${report.identifiers.length})`}>
            <p className="mb-2 text-muted">
              An automatic check found text that might identify a person, company, place or ID.
              Edit it out, or ignore it if it is harmless.
            </p>
            <ul className="space-y-1">
              {report.identifiers.map((f) => (
                <li key={`${f.where}|${f.text}`}>
                  <b dir="auto">“{f.text}”</b> in <i>{f.where}</i>{" "}
                  <span className="text-muted">— {f.reason}</span>
                </li>
              ))}
            </ul>
          </Panel>
        ) : (
          <Panel tone="neutral" title="Identifying details">
            <p className="text-ok">
              The automatic check found no names, companies, places or ID numbers. Please still read
              through before approving.
            </p>
          </Panel>
        )}

        <Panel
          tone={sb.missing_information.length ? "warn" : "neutral"}
          title={`Missing information (${sb.missing_information.length})`}
        >
          {sb.missing_information.length ? (
            <>
              <p className="mb-2 text-muted">
                Claude did not guess these. If you know them, add them to the narration.
              </p>
              <ul dir={dir} lang={lang} className="list-disc space-y-0.5 ps-5">
                {sb.missing_information.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-muted">Nothing flagged.</p>
          )}
        </Panel>

        {sb.anonymisation_notes.length > 0 && (
          <Panel tone="neutral" title="What Claude removed">
            <ul dir={dir} lang={lang} className="list-disc space-y-0.5 ps-5 text-muted">
              {sb.anonymisation_notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </Panel>
        )}

        {generalWarnings.length > 0 && (
          <Panel tone="warn" title="Storyboard checks">
            <ul className="list-disc space-y-0.5 ps-5">
              {generalWarnings.map((w) => (
                <li key={w.message}>{w.message}</li>
              ))}
            </ul>
          </Panel>
        )}
      </div>

      {/* ---------- Video settings ---------- */}
      <section className="flex flex-wrap items-end gap-6 rounded-xl border border-slate-200 bg-surface p-4">
        <Choice
          label="Format"
          value={aspectRatio}
          onChange={(v) => {
            setAspectRatio(v);
            setDirty(true);
          }}
          options={[
            { value: "16:9", label: "16:9", hint: "Screens" },
            { value: "9:16", label: "9:16", hint: "WhatsApp / mobile" },
          ]}
        />
        <Choice
          label="Target length"
          value={targetSeconds}
          onChange={(v) => {
            setTargetSeconds(v);
            setDirty(true);
          }}
          options={[
            { value: 60, label: "60 s" },
            { value: 90, label: "90 s" },
          ]}
        />
        <div className="min-w-56 flex-1">
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <span className="font-semibold">Total length</span>
            <span className={durationOk ? "text-ok" : "font-semibold text-amber-700"}>
              {report.totalSeconds}s of {targetSeconds}s
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-200">
            <div
              className={`h-full ${durationOk ? "bg-ok" : "bg-amber-500"}`}
              style={{ width: `${Math.min(100, (report.totalSeconds / targetSeconds) * 100)}%` }}
            />
          </div>
          <button
            type="button"
            onClick={() => update({ scenes: fitDurations(sb.scenes, targetSeconds) })}
            className="mt-2 inline-flex items-center gap-1 text-sm text-brand hover:underline"
          >
            <Wand2 size={14} /> Fit scene lengths to {targetSeconds}s
          </button>
        </div>
      </section>

      {/* ---------- Preview ---------- */}
      <section className="space-y-2">
        <h2 className="text-lg font-bold">Preview</h2>
        <p className="text-sm text-muted">
          Updates as you edit. Subtitle timing is estimated until a voiceover has been generated.
        </p>
        <VideoPreview projectId={id} storyboard={sb} aspectRatio={aspectRatio} audio={project.audio} />
      </section>

      <RenderPanel
        project={project}
        canRender={canRender}
        dirty={dirty}
        ttsProvider={ttsProvider}
        busy={busy}
        onRender={render}
        onVoiceover={voiceover}
      />

      {/* ---------- Scenes ---------- */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold">Scenes</h2>
        <p className="text-sm text-muted">
          Edit the text, change the visual type, drag or use the arrows to reorder, or delete scenes.
        </p>
        {sb.scenes.map((scene, i) => (
          <SceneCard
            key={scene.id}
            scene={scene}
            index={i}
            count={sb.scenes.length}
            language={lang}
            warnings={sceneWarnings(scene.id)}
            problems={sceneProblems(scene.id)}
            media={sb.media ?? []}
            imageBase={`/api/projects/${id}/files/images/`}
            onChange={(patch) => updateScene(scene.id, patch)}
            onMove={(to) => moveScene(i, to)}
            onDelete={() => update({ scenes: sb.scenes.filter((s) => s.id !== scene.id) })}
            isDragOver={dragOver === i && dragFrom !== i}
            dragHandlers={{
              draggable: true,
              onDragStart: (e) => {
                // Let people select text in inputs without starting a drag.
                const tag = (e.target as HTMLElement).tagName;
                if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
                  e.preventDefault();
                  return;
                }
                setDragFrom(i);
                e.dataTransfer.effectAllowed = "move";
              },
              onDragOver: (e) => {
                if (dragFrom === null) return;
                e.preventDefault();
                setDragOver(i);
              },
              onDrop: (e) => {
                e.preventDefault();
                if (dragFrom !== null) moveScene(dragFrom, i);
                setDragFrom(null);
                setDragOver(null);
              },
              onDragEnd: () => {
                setDragFrom(null);
                setDragOver(null);
              },
            }}
          />
        ))}
        <button
          type="button"
          onClick={addScene}
          disabled={sb.scenes.length >= 10}
          className="inline-flex items-center gap-1 rounded-lg border border-dashed border-slate-400 px-3 py-2 text-sm text-muted hover:border-brand hover:text-brand disabled:opacity-40"
        >
          <Plus size={16} /> Add scene
        </button>
      </section>

      {/* ---------- Summary (record) ---------- */}
      <details open={sb.source === "alert"} className="rounded-xl border border-slate-200 bg-surface p-4">
        <summary className="cursor-pointer font-semibold">
          LFI summary <span className="font-normal text-muted">(for the record; the video uses the scenes above)</span>
        </summary>
        <div className="mt-4 space-y-4">
          <div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">What happened</div>
            <textarea
              dir={dir}
              lang={lang}
              rows={3}
              value={sb.what_happened}
              onChange={(e) => update({ what_happened: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <ListEditor
            label="Why it happened (root causes)"
            items={sb.why_it_happened}
            onChange={(why_it_happened) => update({ why_it_happened })}
            dir={dir}
            lang={lang}
          />
          <div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Key lesson</div>
            <input
              dir={dir}
              lang={lang}
              value={sb.key_lesson}
              onChange={(e) => update({ key_lesson: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <ListEditor
            label={sb.source === "alert" ? "How to sustain the learning (shown in the “sustain” scene)" : "Actions (what to do differently)"}
            items={sb.actions}
            onChange={(actions) => update({ actions })}
            dir={dir}
            lang={lang}
          />
          {(sb.source === "alert" || (sb.reflective_questions ?? []).length > 0) && (
            <ListEditor
              label="Reflective questions for the team (shown in the “questions” scene)"
              items={sb.reflective_questions ?? []}
              onChange={(reflective_questions) => update({ reflective_questions })}
              dir={dir}
              lang={lang}
            />
          )}
          {sb.facts && (
            <div>
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
                Title card details (empty = not shown)
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {(
                  [
                    ["date", "Date"],
                    ["time", "Time"],
                    ["location", "Location"],
                    ["risk_category", "Risk category"],
                    ["potential_severity", "Potential severity"],
                    ["actual_severity", "Actual severity"],
                    ["activity", "Activity"],
                    ["injury_or_asset_damaged", "Injury / asset damaged"],
                  ] as [keyof Facts, string][]
                ).map(([k, label]) => (
                  <label key={k} className="text-xs">
                    <span className="text-muted">{label}</span>
                    <input
                      dir={dir}
                      lang={lang}
                      value={sb.facts?.[k] ?? ""}
                      onChange={(e) => update({ facts: { ...sb.facts!, [k]: e.target.value } })}
                      className="mt-0.5 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                    />
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </details>

      <details className="rounded-xl border border-slate-200 bg-surface p-4">
        <summary className="cursor-pointer font-semibold">
          {project.alertId ? (
            <>
              Reviewed alert fields <span className="font-normal text-muted">(company names and IDs were removed from the file)</span>
            </>
          ) : (
            <>
              Original description <span className="font-normal text-muted">(not anonymised, never shown in the video)</span>
            </>
          )}
        </summary>
        {project.alertId && (
          <Link href={`/alerts/${project.alertId}`} className="mt-3 inline-block text-sm text-brand underline">
            Open the alert review (fields and pictures)
          </Link>
        )}
        <p dir="auto" className="mt-3 whitespace-pre-wrap text-sm text-muted">
          {project.sourceText}
        </p>
      </details>

      {/* ---------- Action bar ---------- */}
      <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-3">
          <div className="me-auto text-sm">
            {error ? (
              <span className="font-semibold text-danger">{error}</span>
            ) : dirty ? (
              <span className="text-amber-700">
                Unsaved changes{project.status === "approved" ? " – saving will need a new approval" : ""}
              </span>
            ) : project.status === "rendering" ? (
              <span className="font-semibold text-sky-700">Rendering… {Math.round(project.render.progress * 100)}%</span>
            ) : approved ? (
              <span className="inline-flex items-center gap-1 font-semibold text-ok">
                <CheckCircle2 size={16} /> Approved{project.status === "done" ? " · video ready" : " · ready to render"}
              </span>
            ) : (
              <span className="text-muted">Review every scene, then approve.</span>
            )}
          </div>
          <button
            type="button"
            onClick={save}
            disabled={!dirty || busy !== null}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:border-brand disabled:opacity-40"
          >
            <Save size={16} /> {busy === "save" ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={approve}
            disabled={approved || busy !== null}
            className="inline-flex items-center gap-1.5 rounded-lg bg-ok px-4 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-40"
          >
            <CheckCircle2 size={16} /> {busy === "approve" ? "Approving…" : approved ? "Approved" : "Approve storyboard"}
          </button>
          <button
            type="button"
            onClick={render}
            disabled={!canRender || busy !== null}
            title={canRender ? "Render the MP4" : "Approve the storyboard first"}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Clapperboard size={16} /> {busy === "render" ? "Starting…" : project.status === "done" ? "Render again" : "Render video"}
          </button>
        </div>
      </div>
    </div>
  );
}

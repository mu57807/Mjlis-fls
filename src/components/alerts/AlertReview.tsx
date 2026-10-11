"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Eraser, Film, ShieldAlert, Trash2, Undo2 } from "lucide-react";
import type { ComplianceIssue } from "@/lib/compliance";
import {
  HEADER_KEYS,
  HEADER_LABELS,
  PICTURE_KINDS,
  PICTURE_KIND_LABELS,
  type Alert,
  type AlertFields,
  type AlertPicture,
  type HeaderKey,
} from "@/lib/alerts/types";
import { ListEditor } from "../review/ListEditor";
import { Choice, Panel } from "../ui";
import { BlurDialog } from "./BlurDialog";

type Lang = "en" | "ar" | "both" | "auto";

export function AlertReview({ id }: { id: string }) {
  const router = useRouter();
  const [alert, setAlert] = useState<Alert | null>(null);
  const [fields, setFields] = useState<AlertFields | null>(null);
  const [pictures, setPictures] = useState<AlertPicture[]>([]);
  const [issues, setIssues] = useState<ComplianceIssue[]>([]);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<null | "save" | "generate">(null);
  const [error, setError] = useState<string | null>(null);
  const [blurring, setBlurring] = useState<AlertPicture | null>(null);
  const [outputLanguage, setOutputLanguage] = useState<Lang>("auto");
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "9:16">("16:9");
  const [targetSeconds, setTargetSeconds] = useState<60 | 90>(60);
  const [version, setVersion] = useState(0);

  const apply = useCallback((a: Alert, i?: ComplianceIssue[]) => {
    setAlert(a);
    setFields(a.fields);
    setPictures(a.pictures);
    if (i) setIssues(i);
    setDirty(false);
    setVersion((v) => v + 1);
  }, []);

  useEffect(() => {
    fetch(`/api/alerts/${id}`)
      .then((r) => r.json())
      .then((d) => (d.alert ? apply(d.alert, d.issues) : setError(d.error ?? "Not found")))
      .catch((e) => setError(String(e)));
  }, [id, apply]);

  // Live rule check while editing (debounced).
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!fields || !dirty) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const res = await fetch(`/api/alerts/${id}/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields, pictures: pictures.map(({ id, use, checked }) => ({ id, use, checked })) }),
      });
      if (res.ok) setIssues((await res.json()).issues);
    }, 500);
  }, [fields, pictures, dirty, id]);

  if (error && !alert) return <Panel tone="danger" title="Could not open this alert">{error}</Panel>;
  if (!alert || !fields) return <p className="text-muted">Loading…</p>;

  const dir = alert.documentLanguage === "ar" ? "rtl" : "ltr";
  const issuesAt = (where: string) => issues.filter((i) => i.where === where);
  const issuesStarting = (prefix: string) => issues.filter((i) => i.where.startsWith(prefix));

  function setField<K extends keyof AlertFields>(k: K, v: AlertFields[K]) {
    setFields((f) => (f ? { ...f, [k]: v } : f));
    setDirty(true);
  }
  function setPic(picId: string, patch: Partial<AlertPicture>) {
    setPictures((ps) => ps.map((p) => (p.id === picId ? { ...p, ...patch } : p)));
    setDirty(true);
  }
  function movePic(i: number, to: number) {
    if (to < 0 || to >= pictures.length) return;
    const ps = [...pictures];
    const [p] = ps.splice(i, 1);
    ps.splice(to, 0, p);
    setPictures(ps);
    setDirty(true);
  }

  async function save(): Promise<boolean> {
    setBusy("save");
    setError(null);
    try {
      const res = await fetch(`/api/alerts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fields: {
            ...fields,
            why_findings: fields!.why_findings.map((s) => s.trim()).filter(Boolean),
            sustain_actions: fields!.sustain_actions.map((s) => s.trim()).filter(Boolean),
            reflective_questions: fields!.reflective_questions.map((s) => s.trim()).filter(Boolean),
          },
          pictures: pictures.map(({ id, use, checked, description, kind }) => ({ id, use, checked, description, kind })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save.");
      apply(data.alert, data.issues);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function generate() {
    if (dirty && !(await save())) return;
    setBusy("generate");
    setError(null);
    try {
      const res = await fetch(`/api/alerts/${id}/storyboard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outputLanguage, aspectRatio, targetSeconds }),
      });
      const data = await res.json();
      if (res.status === 409 && data.issues) {
        setIssues(data.issues);
        throw new Error("Fix the problems highlighted in red first.");
      }
      if (!res.ok) throw new Error(data.error || "Could not create the storyboard.");
      router.push(`/projects/${data.projectIds[0]}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(null);
    }
  }

  async function saveBlur(pic: AlertPicture, blob: Blob) {
    if (dirty && !(await save())) throw new Error("Save your other changes first.");
    const res = await fetch(`/api/alerts/${id}/pictures/${pic.id}`, { method: "PUT", body: blob });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Could not save the blurred picture.");
    const r2 = await fetch(`/api/alerts/${id}`);
    const d2 = await r2.json();
    apply(d2.alert, d2.issues);
    setBlurring(null);
  }

  async function undoBlur(pic: AlertPicture) {
    if (dirty && !(await save())) return;
    await fetch(`/api/alerts/${id}/pictures/${pic.id}`, { method: "DELETE" });
    const d = await (await fetch(`/api/alerts/${id}`)).json();
    apply(d.alert, d.issues);
  }

  const fieldClass = (where: string) =>
    `w-full rounded-md border px-3 py-2 text-sm ${issuesAt(where).length ? "border-red-500 bg-red-50" : "border-slate-300"}`;
  const issueText = (where: string) =>
    issuesAt(where).length ? (
      <ul className="mt-1 space-y-0.5 text-xs font-semibold text-danger">
        {issuesAt(where).map((i) => (
          <li key={i.key} className={i.overridable ? "text-amber-800" : ""}>
            {i.overridable ? "⚠️" : "⛔"} “{i.text}” – {i.reason}
          </li>
        ))}
      </ul>
    ) : null;

  // Names/IDs known from the file block the storyboard; possible matches and
  // flagged pictures are warnings here and are checked strictly before rendering.
  const blocking = issues.filter((i) => !i.overridable).length;
  const warnings = issues.length - blocking;
  const used = pictures.filter((p) => p.use).length;

  return (
    <div className="space-y-6 pb-28">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Link href="/history" className="text-muted hover:underline">
          ← History
        </Link>
        <span className="text-slate-300">|</span>
        <span className="font-semibold">
          {alert.fileType === "text" ? "Review the incident facts (typed description)" : `Review the uploaded alert (${alert.fileType.toUpperCase()})`}
        </span>
      </div>
      <h1 dir={dir} className="text-2xl font-bold">
        {fields.incident_title || "Untitled alert"}
      </h1>

      {issues.length > 0 ? (
        <Panel
          tone={blocking > 0 ? "danger" : "warn"}
          title={
            <span className="inline-flex items-center gap-1.5">
              <ShieldAlert size={16} />
              {blocking > 0 ? `${blocking} problem(s) to fix before making the storyboard` : `${warnings} thing(s) to check`}
            </span>
          }
        >
          <p className="mb-2">
            Company names, people&apos;s names, exact locations and incident / reference numbers must never appear, and
            flagged pictures must be blurred, removed or confirmed. The places are highlighted below. Names and IDs
            found in the original or on your names list must be removed now; everything else is checked again before
            the video is rendered.
          </p>
          <ul className="space-y-0.5">
            {issues.map((i) => (
              <li key={`${i.key}|${i.where}`}>
                {i.overridable ? "⚠️ " : "⛔ "}
                <b dir="auto">“{i.text}”</b> in <i>{i.where}</i> <span className="text-muted">– {i.reason}</span>
              </li>
            ))}
          </ul>
        </Panel>
      ) : (
        <Panel tone="neutral" title="Rule check">
          <p className="text-ok">No company, person or place names, IDs or unchecked pictures found. Please still read everything.</p>
        </Panel>
      )}
      {alert.notes.length > 0 && (
        <Panel tone="neutral" title="Removed before the facts were made">
          <ul className="list-disc ps-5 text-muted">
            {alert.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </Panel>
      )}

      {/* ---------- Header ---------- */}
      <section className="rounded-xl border border-slate-200 bg-surface p-4">
        <h2 className="mb-3 text-lg font-bold">Header</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {HEADER_KEYS.map((k: HeaderKey) => (
            <label key={k} className={k === "incident_title" || k === "location" ? "sm:col-span-2" : ""}>
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">{HEADER_LABELS[k]}</span>
              <input
                dir="auto"
                value={fields[k]}
                placeholder={alert.fileType === "text" ? "Not stated" : "Not in the file"}
                onChange={(e) => setField(k, e.target.value)}
                className={fieldClass(HEADER_LABELS[k])}
              />
              {issueText(HEADER_LABELS[k])}
            </label>
          ))}
        </div>
      </section>

      {/* ---------- Content ---------- */}
      <section className="space-y-4 rounded-xl border border-slate-200 bg-surface p-4">
        <h2 className="text-lg font-bold">Content</h2>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">What happened?</span>
          <textarea dir="auto" rows={4} value={fields.what_happened} placeholder={alert.fileType === "text" ? "Not stated" : "Not in the file"}
            onChange={(e) => setField("what_happened", e.target.value)} className={fieldClass("What happened")} />
          {issueText("What happened")}
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Key message (under the main picture)</span>
          <input dir="auto" value={fields.key_message} placeholder={alert.fileType === "text" ? "Not stated" : "Not in the file"}
            onChange={(e) => setField("key_message", e.target.value)} className={fieldClass("Key message")} />
          {issueText("Key message")}
        </label>
        {(
          [
            ["why_findings", "Why it happened / Findings", "Finding"],
            ["sustain_actions", "How can this learning be sustained at site?", "Sustain"],
            ["reflective_questions", "Reflective questions to discuss with your team", "Question"],
          ] as const
        ).map(([key, label, prefix]) => (
          <div key={key} className={issuesStarting(prefix + " ").length ? "rounded-lg ring-2 ring-red-400 p-2" : ""}>
            <ListEditor label={label} items={fields[key]} onChange={(v) => setField(key, v)} dir={dir} lang={alert.documentLanguage} />
            {fields[key].map((_, i) => <span key={i}>{issueText(`${prefix} ${i + 1}`)}</span>)}
          </div>
        ))}
      </section>

      {/* ---------- Pictures ---------- */}
      <section className="space-y-3 rounded-xl border border-slate-200 bg-surface p-4">
        <h2 className="text-lg font-bold">Pictures ({used} used in the video)</h2>
        <p className="text-sm text-muted">
          Incident photos and diagrams are shown during “What happened”, in this order. Pictures marked ⚠️ may show a
          logo, company name, vehicle plate or ID: blur them, stop using them, or confirm they are safe.
        </p>
        {pictures.length === 0 && (
          <p className="text-sm text-muted">{alert.fileType === "text" ? "A typed description has no pictures." : "No pictures were found in the file."}</p>
        )}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pictures.map((p, i) => {
            const problem = issuesAt(`Picture ${i + 1}`).length > 0;
            return (
              <article key={p.id} className={`overflow-hidden rounded-xl border bg-page ${problem ? "border-red-500 ring-2 ring-red-300" : "border-slate-200"} ${p.use ? "" : "opacity-60"}`}>
                <div className="relative bg-slate-900">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/alerts/${id}/files/${p.file}?v=${version}`} alt={p.description} className="h-44 w-full object-contain" />
                  <span className="absolute start-2 top-2 rounded-full bg-brand px-2 py-0.5 text-xs font-bold text-white">{i + 1}</span>
                  {p.flagged && !p.checked && (
                    <span className="absolute end-2 top-2 rounded-full bg-amber-400 px-2 py-0.5 text-xs font-bold text-black">⚠️ check</span>
                  )}
                  {p.blurred && <span className="absolute end-2 bottom-2 rounded-full bg-sky-600 px-2 py-0.5 text-xs font-bold text-white">blurred</span>}
                </div>
                <div className="space-y-2 p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <select value={p.kind} aria-label="Picture type" onChange={(e) => setPic(p.id, { kind: e.target.value as AlertPicture["kind"] })}
                      className="rounded border border-slate-300 bg-white px-1.5 py-1 text-xs">
                      {PICTURE_KINDS.map((k) => <option key={k} value={k}>{PICTURE_KIND_LABELS[k]}</option>)}
                    </select>
                    <span className="text-xs text-muted">{p.source}</span>
                  </div>
                  <input dir="auto" value={p.description} placeholder="Short description" aria-label="Description"
                    onChange={(e) => setPic(p.id, { description: e.target.value })}
                    className="w-full rounded border border-slate-300 px-2 py-1 text-xs" />
                  {p.flagged && (
                    <p className={`text-xs ${p.checked ? "text-muted" : "font-semibold text-amber-800"}`}>
                      May show: {p.flag_reasons.join(", ")}
                    </p>
                  )}
                  <label className="flex items-center gap-2 text-xs font-semibold">
                    <input type="checkbox" checked={p.use} onChange={(e) => setPic(p.id, { use: e.target.checked })} />
                    Use in the video
                  </label>
                  {p.flagged && (
                    <label className="flex items-center gap-2 text-xs">
                      <input type="checkbox" checked={p.checked} onChange={(e) => setPic(p.id, { checked: e.target.checked })} />
                      I checked it: no logo, company name, plate or ID is visible
                    </label>
                  )}
                  <div className="flex flex-wrap gap-1 pt-1">
                    <IconBtn label="Move earlier" onClick={() => movePic(i, i - 1)} disabled={i === 0}><ArrowLeft size={14} /></IconBtn>
                    <IconBtn label="Move later" onClick={() => movePic(i, i + 1)} disabled={i === pictures.length - 1}><ArrowRight size={14} /></IconBtn>
                    <button type="button" onClick={() => setBlurring(p)} className="inline-flex items-center gap-1 rounded border border-slate-300 px-2 py-1 text-xs font-semibold hover:border-brand">
                      <Eraser size={14} /> Blur…
                    </button>
                    {p.blurred && (
                      <button type="button" onClick={() => undoBlur(p)} className="inline-flex items-center gap-1 rounded border border-slate-300 px-2 py-1 text-xs hover:border-brand">
                        <Undo2 size={14} /> Undo blur
                      </button>
                    )}
                    <IconBtn label="Delete picture" danger onClick={() => {
                      if (confirm(`Delete picture ${i + 1}?`)) {
                        setPictures((ps) => ps.filter((x) => x.id !== p.id));
                        setDirty(true);
                      }
                    }}><Trash2 size={14} /></IconBtn>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* ---------- Video options ---------- */}
      <section className="flex flex-wrap items-end gap-6 rounded-xl border border-slate-200 bg-surface p-4">
        <Choice label="Video language" value={outputLanguage} onChange={setOutputLanguage} options={[
          { value: "auto", label: alert.documentLanguage === "ar" ? "العربية" : "English", hint: alert.fileType === "text" ? "Same as the description" : "Same as the file" },
          { value: alert.documentLanguage === "ar" ? "en" : "ar", label: alert.documentLanguage === "ar" ? "English" : "العربية", hint: "Translated" },
          { value: "both", label: "Both", hint: "Two videos" },
        ]} />
        <Choice label="Format" value={aspectRatio} onChange={setAspectRatio} options={[
          { value: "16:9", label: "16:9", hint: "Screens" },
          { value: "9:16", label: "9:16", hint: "WhatsApp / mobile" },
        ]} />
        <Choice label="Length" value={targetSeconds} onChange={setTargetSeconds} options={[
          { value: 60, label: "60 s" },
          { value: 90, label: "90 s" },
        ]} />
      </section>

      {alert.projectIds.length > 0 && (
        <Panel tone="info" title="Storyboards already made from this alert">
          <ul className="list-disc ps-5">
            {alert.projectIds.map((pid) => (
              <li key={pid}><Link className="underline" href={`/projects/${pid}`}>Open storyboard</Link></li>
            ))}
          </ul>
        </Panel>
      )}

      {/* ---------- Action bar ---------- */}
      <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-3">
          <div className="me-auto text-sm">
            {error ? <span className="font-semibold text-danger">{error}</span>
              : blocking ? <span className="font-semibold text-danger">{blocking} problem(s) must be fixed first</span>
              : dirty ? <span className="text-amber-700">Unsaved changes</span>
              : <span className="text-muted">Check every field and picture, then create the storyboard.</span>}
          </div>
          <button type="button" onClick={save} disabled={!dirty || busy !== null}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:border-brand disabled:opacity-40">
            <Check size={16} /> {busy === "save" ? "Saving…" : "Save"}
          </button>
          <button type="button" onClick={generate} disabled={busy !== null || blocking > 0}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40">
            <Film size={16} /> {busy === "generate" ? "Writing the storyboard…" : "Create storyboard"}
          </button>
        </div>
      </div>

      {blurring && (
        <BlurDialog
          src={`/api/alerts/${id}/files/${blurring.file}?v=${version}`}
          onClose={() => setBlurring(null)}
          onSave={(blob) => saveBlur(blurring, blob)}
        />
      )}
    </div>
  );
}

function IconBtn({ label, onClick, disabled, danger, children }: {
  label: string; onClick: () => void; disabled?: boolean; danger?: boolean; children: React.ReactNode;
}) {
  return (
    <button type="button" title={label} aria-label={label} onClick={onClick} disabled={disabled}
      className={`rounded border border-slate-300 p-1.5 disabled:opacity-30 ${danger ? "text-danger hover:bg-red-50" : "hover:bg-slate-100"}`}>
      {children}
    </button>
  );
}

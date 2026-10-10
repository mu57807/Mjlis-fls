"use client";

import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, GripVertical, ShieldAlert, Trash2, X } from "lucide-react";
import type { ComplianceIssue } from "@/lib/compliance";
import {
  ICONS,
  ICON_LABELS,
  VISUAL_TYPES,
  VISUAL_TYPE_LABELS,
  type IconName,
  type Language,
  type VisualType,
} from "@/lib/catalog";
import type { Media, Scene } from "@/lib/schema";
import { countWords, estimateSpeechSeconds } from "@/lib/storyboard-checks";
import { SafetyIcon } from "../SafetyIcon";

const MAX_ICONS = 4;

export function SceneCard({
  scene,
  index,
  count,
  language,
  warnings,
  problems = [],
  media = [],
  imageBase,
  onChange,
  onMove,
  onDelete,
  dragHandlers,
  isDragOver,
}: {
  scene: Scene;
  index: number;
  count: number;
  language: Language;
  warnings: string[];
  /** Final-check problems in this scene (company names, IDs, unchecked pictures). */
  problems?: ComplianceIssue[];
  /** Pictures available to the video. */
  media?: Media[];
  imageBase?: string;
  onChange: (patch: Partial<Scene>) => void;
  onMove: (to: number) => void;
  onDelete: () => void;
  dragHandlers: React.HTMLAttributes<HTMLElement> & { draggable: boolean };
  isDragOver: boolean;
}) {
  const dir = language === "ar" ? "rtl" : "ltr";
  const speech = estimateSpeechSeconds(scene.narration, language);
  const tooLong = speech > scene.duration_seconds * 1.1;

  return (
    <article
      {...dragHandlers}
      className={`rounded-xl border bg-surface p-4 shadow-sm transition ${
        problems.length > 0
          ? "border-red-500 ring-2 ring-red-300"
          : isDragOver
            ? "border-accent ring-2 ring-accent/40"
            : "border-slate-200"
      }`}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span
          className="cursor-grab text-slate-400 active:cursor-grabbing"
          title="Drag to reorder"
          aria-hidden
        >
          <GripVertical size={18} />
        </span>
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">
          {index + 1}
        </span>
        <select
          aria-label="Visual type"
          value={scene.visual_type}
          onChange={(e) => onChange({ visual_type: e.target.value as VisualType })}
          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm font-medium"
        >
          {VISUAL_TYPES.map((v) => (
            <option key={v} value={v}>
              {VISUAL_TYPE_LABELS[v].en}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1 text-sm">
          <input
            type="number"
            min={2}
            max={40}
            step={0.5}
            value={scene.duration_seconds}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (Number.isFinite(n)) onChange({ duration_seconds: Math.min(40, Math.max(2, n)) });
            }}
            className="w-16 rounded-md border border-slate-300 px-2 py-1 text-right"
            aria-label="Duration in seconds"
          />
          <span className="text-muted">sec</span>
        </label>
        <div className="ml-auto flex gap-1">
          <IconButton label="Move up" disabled={index === 0} onClick={() => onMove(index - 1)}>
            <ArrowUp size={16} />
          </IconButton>
          <IconButton label="Move down" disabled={index === count - 1} onClick={() => onMove(index + 1)}>
            <ArrowDown size={16} />
          </IconButton>
          <IconButton
            label="Delete scene"
            disabled={count <= 1}
            onClick={() => {
              if (confirm(`Delete scene ${index + 1}?`)) onDelete();
            }}
            danger
          >
            <Trash2 size={16} />
          </IconButton>
        </div>
      </div>

      {(scene.visual_type === "root_cause" || scene.visual_type === "checklist") && (
        <p className="mb-3 rounded-md bg-sky-50 px-3 py-1.5 text-xs text-sky-900">
          The bullet points in this scene come from{" "}
          <b>{scene.visual_type === "root_cause" ? "“Why it happened”" : "“Actions”"}</b> in the LFI summary
          below.
        </p>
      )}
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
        On-screen caption
      </label>
      <input
        dir={dir}
        lang={language}
        aria-label={`Scene ${index + 1} caption`}
        value={scene.caption}
        onChange={(e) => onChange({ caption: e.target.value })}
        className={`mb-3 w-full rounded-md border px-3 py-2 font-semibold ${problems.some((p) => p.where.endsWith("caption")) ? "border-red-500 bg-red-50" : "border-slate-300"}`}
      />

      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
        Narration (voiceover)
      </label>
      <textarea
        dir={dir}
        lang={language}
        aria-label={`Scene ${index + 1} narration`}
        value={scene.narration}
        onChange={(e) => onChange({ narration: e.target.value })}
        rows={3}
        className={`w-full rounded-md border px-3 py-2 ${problems.some((p) => p.where.endsWith("narration")) ? "border-red-500 bg-red-50" : tooLong ? "border-amber-400" : "border-slate-300"}`}
      />
      <p className={`mt-1 text-xs ${tooLong ? "font-semibold text-amber-700" : "text-muted"}`}>
        {countWords(scene.narration)} words · about {Math.ceil(speech)}s to read aloud
        {tooLong ? ` – longer than this ${scene.duration_seconds}s scene` : ""}
      </p>

      <div className="mt-3">
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
          Icons ({scene.icons.length}/{MAX_ICONS})
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {scene.icons.map((icon) => (
            <span
              key={icon}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-page py-1 pl-2 pr-1 text-sm"
            >
              <SafetyIcon name={icon} className="h-4 w-4 text-brand" />
              {ICON_LABELS[icon]}
              <button
                type="button"
                aria-label={`Remove ${ICON_LABELS[icon]}`}
                onClick={() => onChange({ icons: scene.icons.filter((i) => i !== icon) })}
                className="rounded-full p-0.5 hover:bg-slate-200"
              >
                <X size={14} />
              </button>
            </span>
          ))}
          {scene.icons.length < MAX_ICONS && (
            <select
              aria-label="Add icon"
              value=""
              onChange={(e) => {
                const v = e.target.value as IconName;
                if (v) onChange({ icons: [...scene.icons, v] });
              }}
              className="rounded-full border border-dashed border-slate-400 bg-white px-2 py-1 text-sm text-muted"
            >
              <option value="">+ Add icon</option>
              {ICONS.filter((i) => !scene.icons.includes(i)).map((i) => (
                <option key={i} value={i}>
                  {ICON_LABELS[i]}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {(scene.visual_type === "what_happened" || (scene.images ?? []).length > 0) && media.length > 0 && (
        <div className="mt-3">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
            Pictures in this scene ({(scene.images ?? []).length})
          </div>
          <div className="flex flex-wrap items-start gap-2">
            {(scene.images ?? []).map((file, k, list) => {
              const m = media.find((x) => x.file === file);
              const unsafe = m?.flagged && !m.checked;
              return (
                <div key={file} className={`w-28 overflow-hidden rounded-md border ${unsafe ? "border-red-500" : "border-slate-300"}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`${imageBase}${file}`} alt={m?.description ?? ""} className="h-16 w-full bg-slate-900 object-contain" />
                  <div className="flex justify-between p-0.5">
                    <button type="button" aria-label="Move earlier" disabled={k === 0} className="p-0.5 disabled:opacity-30"
                      onClick={() => {
                        const imgs = [...list];
                        [imgs[k - 1], imgs[k]] = [imgs[k], imgs[k - 1]];
                        onChange({ images: imgs });
                      }}><ArrowLeft size={13} /></button>
                    <button type="button" aria-label="Remove picture from scene" className="p-0.5 text-danger"
                      onClick={() => onChange({ images: list.filter((f) => f !== file) })}><X size={13} /></button>
                    <button type="button" aria-label="Move later" disabled={k === list.length - 1} className="p-0.5 disabled:opacity-30"
                      onClick={() => {
                        const imgs = [...list];
                        [imgs[k + 1], imgs[k]] = [imgs[k], imgs[k + 1]];
                        onChange({ images: imgs });
                      }}><ArrowRight size={13} /></button>
                  </div>
                </div>
              );
            })}
            {media.some((m) => !(scene.images ?? []).includes(m.file)) && (
              <select aria-label="Add picture" value="" className="rounded border border-dashed border-slate-400 bg-white px-2 py-1 text-xs text-muted"
                onChange={(e) => e.target.value && onChange({ images: [...(scene.images ?? []), e.target.value] })}>
                <option value="">+ Add picture</option>
                {media.filter((m) => !(scene.images ?? []).includes(m.file)).map((m, i) => (
                  <option key={m.file} value={m.file}>{m.description || `Picture ${i + 1}`}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      )}

      {problems.length > 0 && (
        <ul className="mt-3 space-y-0.5 rounded-md bg-red-50 py-2 pl-3 pr-3 text-xs font-semibold text-red-900">
          {problems.map((p) => (
            <li key={`${p.key}|${p.where}`} className="flex gap-1.5">
              <ShieldAlert size={14} className="mt-0.5 shrink-0" />
              <span>
                <mark className="bg-red-200 px-0.5">{p.text}</mark> ({p.where}): {p.reason}
              </span>
            </li>
          ))}
        </ul>
      )}

      {warnings.length > 0 && (
        <ul className="mt-3 list-disc space-y-0.5 rounded-md bg-amber-50 py-2 pl-7 pr-3 text-xs text-amber-900">
          {warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}
    </article>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`rounded-md border border-slate-200 p-1.5 disabled:opacity-30 ${
        danger ? "text-danger hover:bg-red-50" : "hover:bg-slate-100"
      }`}
    >
      {children}
    </button>
  );
}

"use client";

import { ArrowDown, ArrowUp, GripVertical, Trash2, X } from "lucide-react";
import {
  ICONS,
  ICON_LABELS,
  VISUAL_TYPES,
  VISUAL_TYPE_LABELS,
  type IconName,
  type Language,
  type VisualType,
} from "@/lib/catalog";
import type { Scene } from "@/lib/schema";
import { countWords, estimateSpeechSeconds } from "@/lib/storyboard-checks";
import { SafetyIcon } from "../SafetyIcon";

const MAX_ICONS = 4;

export function SceneCard({
  scene,
  index,
  count,
  language,
  warnings,
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
        isDragOver ? "border-accent ring-2 ring-accent/40" : "border-slate-200"
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
        className="mb-3 w-full rounded-md border border-slate-300 px-3 py-2 font-semibold"
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
        className={`w-full rounded-md border px-3 py-2 ${tooLong ? "border-amber-400" : "border-slate-300"}`}
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

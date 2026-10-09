"use client";

import { Download, Film, Image as ImageIcon, Mic, RefreshCw, Subtitles } from "lucide-react";
import type { Project } from "@/lib/schema";
import { Panel } from "../ui";

export function RenderPanel({
  project,
  canRender,
  dirty,
  ttsProvider,
  busy,
  onRender,
  onVoiceover,
}: {
  project: Project;
  canRender: boolean;
  dirty: boolean;
  ttsProvider: string;
  busy: null | string;
  onRender: () => void;
  onVoiceover: () => void;
}) {
  const r = project.render;
  const files = `/api/projects/${project.id}/files`;
  // Cache-buster so a re-render shows the new video.
  const v = encodeURIComponent(r.renderedAt ?? "");

  return (
    <section id="video" className="space-y-4 rounded-xl border border-slate-200 bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-bold">Video</h2>
        <span className="text-sm text-muted">
          Voice:{" "}
          {ttsProvider === "none"
            ? "none (subtitles only – add an ElevenLabs or Azure key for voiceover)"
            : ttsProvider === "misconfigured"
              ? "settings problem – check TTS_PROVIDER in .env.local"
              : ttsProvider === "elevenlabs"
                ? "ElevenLabs"
                : "Azure"}
        </span>
        {ttsProvider !== "none" && ttsProvider !== "misconfigured" && (
          <button
            type="button"
            onClick={onVoiceover}
            disabled={dirty || busy !== null || project.status === "rendering"}
            title={dirty ? "Save first" : "Hear the narration in the preview before rendering"}
            className="ms-auto inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold hover:border-brand disabled:opacity-40"
          >
            <Mic size={16} /> {busy === "voiceover" ? "Generating voiceover…" : "Generate voiceover for preview"}
          </button>
        )}
      </div>

      {project.status === "rendering" && (
        <div>
          <div className="mb-1 flex justify-between text-sm">
            <span className="font-semibold">{r.stage ?? "Working"}…</span>
            <span className="text-muted">{Math.round(r.progress * 100)}%</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full bg-accent transition-all duration-700" style={{ width: `${r.progress * 100}%` }} />
          </div>
          <p className="mt-2 text-xs text-muted">
            A 60-second video usually takes 1–4 minutes. You can leave this page; the render continues.
          </p>
        </div>
      )}

      {project.status === "failed" && r.error && (
        <Panel tone="danger" title="The render failed">
          <p className="whitespace-pre-wrap">{r.error}</p>
        </Panel>
      )}

      {project.status === "done" && r.videoFile && (
        <div className="space-y-3">
          <video
            key={v}
            controls
            preload="metadata"
            poster={r.thumbFile ? `${files}/thumbnail.jpg?v=${v}` : undefined}
            src={`${files}/video.mp4?v=${v}`}
            className={`rounded-lg bg-black ${project.aspectRatio === "9:16" ? "mx-auto max-h-[70vh]" : "w-full"}`}
          />
          <div className="flex flex-wrap gap-2">
            <a
              href={`${files}/video.mp4?download=1`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:brightness-110"
            >
              <Download size={16} /> Download MP4
            </a>
            <a
              href={`${files}/thumbnail.jpg?download=1`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:border-brand"
            >
              <ImageIcon size={16} /> Thumbnail
            </a>
            <a
              href={`${files}/subtitles.srt?download=1`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:border-brand"
            >
              <Subtitles size={16} /> Subtitles (.srt)
            </a>
            <span className="self-center text-xs text-muted">
              {r.videoSeconds ? `${Math.round(r.videoSeconds)} s · ` : ""}
              {project.aspectRatio} · rendered {r.renderedAt ? new Date(r.renderedAt).toLocaleString() : ""}
            </span>
          </div>
        </div>
      )}

      {project.status !== "rendering" && (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onRender}
            disabled={!canRender || busy !== null}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {project.status === "done" || project.status === "failed" ? <RefreshCw size={16} /> : <Film size={16} />}
            {project.status === "done" ? "Render again" : project.status === "failed" ? "Try again" : "Render video"}
          </button>
          {!canRender && (
            <span className="text-sm text-muted">
              {dirty ? "Save and approve your changes first." : "Approve the storyboard to render the video."}
            </span>
          )}
        </div>
      )}
    </section>
  );
}

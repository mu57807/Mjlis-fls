"use client";

import { useEffect, useRef, useState } from "react";
import { Eraser, Undo2, X } from "lucide-react";

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Pixelate and blur one area of the canvas (strong enough to hide text, logos and plates). */
function obscure(ctx: CanvasRenderingContext2D, img: CanvasImageSource, r: Rect) {
  const block = Math.max(10, Math.round(Math.min(r.w, r.h) / 6));
  const small = document.createElement("canvas");
  small.width = Math.max(1, Math.round(r.w / block));
  small.height = Math.max(1, Math.round(r.h / block));
  const s = small.getContext("2d")!;
  s.drawImage(img, r.x, r.y, r.w, r.h, 0, 0, small.width, small.height);
  ctx.save();
  ctx.beginPath();
  ctx.rect(r.x, r.y, r.w, r.h);
  ctx.clip();
  ctx.imageSmoothingEnabled = false;
  ctx.filter = `blur(${Math.round(block / 2)}px)`;
  ctx.drawImage(small, 0, 0, small.width, small.height, r.x - block, r.y - block, r.w + 2 * block, r.h + 2 * block);
  ctx.restore();
}

/**
 * Simple blur tool: drag boxes over anything that must not be shown
 * (logos, company names, number plates, IDs), then save.
 */
export function BlurDialog({
  src,
  onClose,
  onSave,
}: {
  src: string;
  onClose: () => void;
  onSave: (blob: Blob) => Promise<void>;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [rects, setRects] = useState<Rect[]>([]);
  const [draft, setDraft] = useState<Rect | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const i = new Image();
    i.onload = () => setImg(i);
    i.onerror = () => setError("The picture could not be loaded.");
    i.src = src;
  }, [src]);

  // Draw the picture with the blurred areas, plus an outline of each box.
  useEffect(() => {
    const c = canvas.current;
    if (!c || !img) return;
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(img, 0, 0);
    for (const r of rects) obscure(ctx, img, r);
    ctx.lineWidth = Math.max(2, img.naturalWidth / 300);
    ctx.setLineDash([12, 8]);
    ctx.strokeStyle = "#F26419";
    for (const r of [...rects, ...(draft ? [draft] : [])]) ctx.strokeRect(r.x, r.y, r.w, r.h);
  }, [img, rects, draft]);

  function toImage(e: React.PointerEvent) {
    const c = canvas.current!;
    const box = c.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(c.width, ((e.clientX - box.left) / box.width) * c.width)),
      y: Math.max(0, Math.min(c.height, ((e.clientY - box.top) / box.height) * c.height)),
    };
  }
  const rectFrom = (a: { x: number; y: number }, b: { x: number; y: number }): Rect => ({
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    w: Math.abs(a.x - b.x),
    h: Math.abs(a.y - b.y),
  });

  async function save() {
    if (!img || rects.length === 0) return;
    setSaving(true);
    setError(null);
    // Final picture at full size, without the outlines.
    const out = document.createElement("canvas");
    out.width = img.naturalWidth;
    out.height = img.naturalHeight;
    const ctx = out.getContext("2d")!;
    ctx.drawImage(img, 0, 0);
    for (const r of rects) obscure(ctx, img, r);
    const blob = await new Promise<Blob | null>((res) => out.toBlob(res, "image/jpeg", 0.92));
    if (!blob) {
      setError("Could not create the picture.");
      setSaving(false);
      return;
    }
    try {
      await onSave(blob);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true">
      <div className="flex max-h-full w-full max-w-4xl flex-col gap-3 rounded-2xl bg-surface p-4">
        <div className="flex items-center gap-2">
          <h2 className="font-bold">Blur parts of the picture</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="ms-auto rounded p-1 hover:bg-slate-100">
            <X size={20} />
          </button>
        </div>
        <p className="text-sm text-muted">
          Drag a box over every logo, company name, number plate or ID. Each box is blurred. Then click{" "}
          <b>Save blurred picture</b>.
        </p>
        <div className="min-h-0 flex-1 overflow-auto rounded-lg bg-slate-900">
          <canvas
            ref={canvas}
            aria-label="Picture – drag to mark areas to blur"
            className="mx-auto block max-h-[60vh] max-w-full cursor-crosshair touch-none"
            onPointerDown={(e) => {
              (e.target as HTMLElement).setPointerCapture(e.pointerId);
              start.current = toImage(e);
            }}
            onPointerMove={(e) => start.current && setDraft(rectFrom(start.current, toImage(e)))}
            onPointerUp={(e) => {
              if (start.current) {
                const r = rectFrom(start.current, toImage(e));
                if (r.w > 6 && r.h > 6) setRects((rs) => [...rs, r]);
              }
              start.current = null;
              setDraft(null);
            }}
          />
          {!img && !error && <p className="p-6 text-center text-sm text-white">Loading…</p>}
        </div>
        {error && <p className="text-sm font-semibold text-danger">{error}</p>}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted">{rects.length} area(s) marked</span>
          <button
            type="button"
            onClick={() => setRects((r) => r.slice(0, -1))}
            disabled={rects.length === 0}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-40"
          >
            <Undo2 size={15} /> Undo last box
          </button>
          <button
            type="button"
            onClick={save}
            disabled={rects.length === 0 || saving}
            className="ms-auto inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            <Eraser size={16} /> {saving ? "Saving…" : "Save blurred picture"}
          </button>
        </div>
      </div>
    </div>
  );
}

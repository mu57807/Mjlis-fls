"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp } from "lucide-react";
import { Panel } from "../ui";

const MAX_MB = 20;

export function AlertUpload({ demoMode }: { demoMode: boolean }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pick(f: File | undefined | null) {
    setError(null);
    if (!f) return;
    if (!/\.(pdf|pptx)$/i.test(f.name)) return setError("Please choose a .pdf or .pptx file.");
    if (f.size > MAX_MB * 1024 * 1024) return setError(`The file is larger than ${MAX_MB} MB.`);
    setFile(f);
  }

  async function upload() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/alerts", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "The file could not be processed.");
      router.push(`/alerts/${data.alertId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {demoMode && (
        <Panel tone="info" title="Uploading needs a Claude API key">
          Demo mode is on. Reading alert files needs Claude: add <code>ANTHROPIC_API_KEY</code> and set{" "}
          <code>LFI_DEMO_MODE=false</code> in <code>.env.local</code>, or use “Type the description”.
        </Panel>
      )}
      <div
        role="button"
        tabIndex={0}
        onClick={() => input.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          pick(e.dataTransfer.files?.[0]);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-10 text-center transition ${
          over ? "border-accent bg-accent-soft" : "border-slate-300 bg-surface hover:border-brand"
        }`}
      >
        <FileUp size={40} className="text-brand" />
        {file ? (
          <>
            <div className="font-semibold">{file.name}</div>
            <div className="text-sm text-muted">{(file.size / 1024 / 1024).toFixed(1)} MB · click to choose another file</div>
          </>
        ) : (
          <>
            <div className="font-semibold">Drop the HSE Flash / LFI alert here, or click to choose it</div>
            <div className="text-sm text-muted">PDF or PowerPoint (.pptx), up to {MAX_MB} MB</div>
          </>
        )}
        <input
          ref={input}
          type="file"
          accept=".pdf,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation"
          className="hidden"
          onChange={(e) => pick(e.target.files?.[0])}
        />
      </div>
      <p className="text-xs text-muted">
        Company names, people&apos;s names and incident / reference numbers are removed while reading. The
        file itself is not kept. Next you review every field and picture before a storyboard is made.
      </p>
      {error && (
        <Panel tone="danger" title="Could not read the file">
          {error}
        </Panel>
      )}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={upload}
          disabled={!file || busy}
          className="rounded-lg bg-accent px-5 py-2.5 font-semibold text-white shadow hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Reading the alert…" : "Read the alert"}
        </button>
        {busy && (
          <span className="text-sm text-muted">
            Extracting the text and pictures and removing company names and IDs. This usually takes 30–90 seconds.
          </span>
        )}
      </div>
    </div>
  );
}

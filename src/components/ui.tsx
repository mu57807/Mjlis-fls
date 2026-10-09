// Small shared UI pieces.
import type { ReactNode } from "react";

export function Choice<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string; hint?: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-semibold">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={String(o.value)}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(o.value)}
              className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                active
                  ? "border-brand bg-brand text-white"
                  : "border-slate-300 bg-surface hover:border-brand"
              }`}
            >
              <div className="font-medium">{o.label}</div>
              {o.hint && (
                <div className={`text-xs ${active ? "text-white/80" : "text-muted"}`}>{o.hint}</div>
              )}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function Panel({
  tone,
  title,
  children,
}: {
  tone: "warn" | "danger" | "info" | "neutral";
  title: ReactNode;
  children: ReactNode;
}) {
  const styles = {
    warn: "border-amber-300 bg-amber-50",
    danger: "border-red-300 bg-red-50",
    info: "border-sky-300 bg-sky-50",
    neutral: "border-slate-200 bg-surface",
  }[tone];
  return (
    <section className={`rounded-xl border p-4 ${styles}`}>
      <h2 className="mb-2 text-sm font-semibold">{title}</h2>
      <div className="text-sm">{children}</div>
    </section>
  );
}

export function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: "bg-slate-200 text-slate-800",
    approved: "bg-green-100 text-green-800",
    rendering: "bg-sky-100 text-sky-800",
    done: "bg-green-600 text-white",
    failed: "bg-red-100 text-red-800",
  };
  const label: Record<string, string> = {
    draft: "Draft – needs approval",
    approved: "Approved",
    rendering: "Rendering",
    done: "Video ready",
    failed: "Render failed",
  };
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${map[status] ?? ""}`}>
      {label[status] ?? status}
    </span>
  );
}

export const LANGUAGE_LABEL: Record<string, string> = { en: "English", ar: "العربية" };

export function OriginBadge({ origin, contact }: { origin: string; contact?: string | null }) {
  if (origin === "web") return null;
  const label = origin === "whatsapp" ? `WhatsApp${contact ? ` +${contact}` : ""}` : "API";
  return (
    <span className="inline-block rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
      {label}
    </span>
  );
}

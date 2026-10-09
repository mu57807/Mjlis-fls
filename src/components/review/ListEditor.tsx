"use client";

import { Plus, X } from "lucide-react";

/** Edit a list of short text items (root causes, actions, …). */
export function ListEditor({
  label,
  items,
  onChange,
  dir,
  lang,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  dir: "ltr" | "rtl";
  lang: string;
}) {
  return (
    <div>
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">{label}</div>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2">
            <input
              dir={dir}
              lang={lang}
              value={item}
              onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))}
              className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            />
            <button
              type="button"
              aria-label="Remove item"
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              className="rounded-md p-1.5 text-muted hover:bg-slate-100"
            >
              <X size={16} />
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => onChange([...items, ""])}
        className="mt-1.5 inline-flex items-center gap-1 text-sm text-brand hover:underline"
      >
        <Plus size={14} /> Add item
      </button>
    </div>
  );
}

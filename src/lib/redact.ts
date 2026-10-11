// The local clean-up. It runs on this server, with no internet, before any
// incident text is sent to Claude. It removes:
//   - every name on the known-names list (company, person, place),
//   - text that looks like an ID / reference number, email, phone number,
//     GPS position, company name, person's name or specific rig / well / site.
// What it removes is returned only so it can be hashed for the final check.
// Claude still anonymises again afterwards; this is the first layer.

import { patternSpans, type PatternSpan } from "./compliance";
import type { KnownName } from "./known-names";

export interface RedactionResult {
  text: string;
  /** The removed strings, to be hashed (never stored as text). */
  removed: string[];
  /** Generic notes for the reviewer ("Removed locally: 2 reference numbers"). */
  notes: string[];
}

type Kind = PatternSpan["kind"];

const PLACEHOLDER: Record<Kind, { en: string; ar: string }> = {
  id: { en: "[reference removed]", ar: "[رقم محذوف]" },
  company: { en: "[company name removed]", ar: "[اسم شركة محذوف]" },
  person: { en: "[name removed]", ar: "[اسم محذوف]" },
  location: { en: "[location removed]", ar: "[موقع محذوف]" },
};

const NOTE_WORDS: Record<Kind, [string, string]> = {
  id: ["reference / ID number", "reference / ID numbers"],
  company: ["company name", "company names"],
  person: ["person's name", "people's names"],
  location: ["exact location", "exact locations"],
};

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Arabic letters that are often written in different ways.
function arabicLoose(s: string): string {
  return s
    .replace(/[اأإآ]/g, "[اأإآ]")
    .replace(/[يى]/g, "[يى]")
    .replace(/[هة]/g, "[هة]");
}

/** A regex for one known name: whole words, any case, flexible spaces/dashes. */
function knownNameRegex(term: string): RegExp | null {
  const words = term.trim().split(/[\s\-_.]+/).filter(Boolean);
  if (words.length === 0 || term.trim().length < 2) return null;
  const arabic = /[\u0600-\u06FF]/.test(term);
  const core = words
    .map((w, i) => {
      if (!arabic) return escapeRe(w);
      const bare = arabicLoose(escapeRe(w.replace(/^ال/, "")));
      // The first word's article is part of the prefix below; later words may have it or not.
      return i === 0 ? bare : `(?:ال)?${bare}`;
    })
    .join("[\\s\\-_.]*");
  // Arabic: allow attached prefixes (و ب ف ك ل) and the article "ال".
  const prefix = arabic ? "((?:[وبفكل]{0,2})(?:ال)?)" : "()";
  return new RegExp(`(?<![\\p{L}\\p{N}])${prefix}${core}(?![\\p{L}\\p{N}])`, "giu");
}

export function redactLocally(input: string, knownNames: KnownName[]): RedactionResult {
  let text = input;
  const removed: string[] = [];
  const counts = new Map<string, number>();
  const count = (key: string) => counts.set(key, (counts.get(key) ?? 0) + 1);

  // 1. The known-names list (longest names first, so "Falcon Logistics" wins over "Falcon").
  for (const n of [...knownNames].sort((a, b) => b.term.length - a.term.length)) {
    const re = knownNameRegex(n.term);
    if (!re) continue;
    text = text.replace(re, (match, pre: string) => {
      removed.push(match.slice(pre.length));
      count(`list:${n.kind}`);
      // Keep a leading "و" / "ف" (and), so the sentence still reads.
      return (pre.match(/^[وف]/)?.[0] ?? "") + n.replacement;
    });
  }

  // 2. Patterns. Replace from the end so the positions stay valid.
  const spans: PatternSpan[] = [];
  let lastEnd = -1;
  for (const s of patternSpans(text).sort((a, b) => a.start - b.start || b.end - a.end)) {
    if (s.start >= lastEnd) {
      spans.push(s);
      lastEnd = s.end;
    }
  }
  // The placeholder follows the language around it (decided before anything is replaced).
  const before = text;
  for (const s of spans.reverse()) {
    const original = text.slice(s.start, s.end);
    if (/^\[[^\]]*\]$/.test(original)) continue;
    const arabic = /[\u0600-\u06FF]/.test(before.slice(Math.max(0, s.start - 40), s.end + 40));
    removed.push(original);
    count(`pattern:${s.kind}`);
    text = text.slice(0, s.start) + PLACEHOLDER[s.kind][arabic ? "ar" : "en"] + text.slice(s.end);
  }

  const notes: string[] = [];
  const listTotal = [...counts].filter(([k]) => k.startsWith("list:")).reduce((n, [, v]) => n + v, 0);
  if (listTotal > 0) notes.push(`Removed locally: ${listTotal} name(s) from your names list.`);
  for (const kind of Object.keys(NOTE_WORDS) as Kind[]) {
    const n = counts.get(`pattern:${kind}`) ?? 0;
    if (n > 0) notes.push(`Removed locally: ${n} ${NOTE_WORDS[kind][n === 1 ? 0 : 1]}.`);
  }
  return { text, removed, notes };
}

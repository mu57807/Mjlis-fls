// The APP RULES check: no company names and no incident IDs / reference
// numbers anywhere in what a video shows or says, and no unchecked pictures
// that may show a logo, name, plate or ID.
//
// Three layers:
//  1. "known"   - names/IDs found in the source, kept only as keyed hashes
//                 (never as text), matched against every word sequence.
//  2. "pattern" - text that looks like a reference number or a company name.
//  3. "image"   - flagged pictures that nobody has checked or blurred yet.
// Claude adds a fourth, "ai", at render time (claude/compliance-check.ts).

import { hmac } from "./secret";
import type { Facts, Storyboard } from "./schema";

export type IssueKind = "company" | "id" | "image";
export type IssueSource = "known" | "pattern" | "ai" | "image";

export interface ComplianceIssue {
  /** Stable key used to acknowledge a false alarm. */
  key: string;
  kind: IssueKind;
  source: IssueSource;
  where: string;
  text: string;
  reason: string;
  sceneId?: string;
  /** False for names/IDs known to come from the source: those must be edited out. */
  overridable: boolean;
}

export interface CheckedText {
  where: string;
  text: string;
  sceneId?: string;
}

// ---------------------------------------------------------------------------
// Normalising and hashing
// ---------------------------------------------------------------------------

// Diacritics (Arabic harakat, accents) and the Arabic tatweel are ignored when matching.
const MARKS = /[\p{M}\u0640]/gu;

export function normalizeTokens(s: string): string[] {
  return s
    .normalize("NFKC")
    .toLowerCase()
    .replace(MARKS, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

// Words that are part of company names but say nothing on their own.
const LEGAL_WORDS = new Set([
  "llc", "l", "ltd", "limited", "inc", "co", "corp", "corporation", "company", "group", "est",
  "establishment", "plc", "gmbh", "wll", "holding", "holdings", "شركه", "مؤسسه", "مجموعه",
]);
// Ordinary words that must never be treated as a name on their own.
const COMMON_WORDS = new Set([
  "the", "and", "of", "for", "a", "an", "contractor", "operator", "client", "crew", "site", "field",
  "camp", "yard", "energy", "oil", "gas", "drilling", "logistics", "services", "contracting",
  "engineering", "transport", "construction", "safety", "team", "vehicle", "truck", "المقاول",
  "المشغل", "العميل", "الفريق", "الموقع", "للمقاولات", "النقل",
  // Labels that often stand next to IDs.
  "permit", "report", "reference", "case", "incident", "number", "work", "order", "badge", "employee",
  "رقم", "تصريح", "تقرير", "بلاغ",
]);

const keyed = (tokens: string[]) => hmac(`lfi-term|${tokens.join(" ")}`);
/** Single words taken from longer names ("Falcon" from "Falcon Logistics"): flagged, but can be dismissed. */
const keyedPart = (word: string) => hmac(`lfi-part|${word}`);

/** Hash a list of sensitive terms (and useful variants). The terms themselves are not kept. */
export function hashTerms(terms: string[]): string[] {
  const out = new Set<string>();
  for (const term of terms) {
    const t = normalizeTokens(term);
    if (t.length === 0) continue;
    const core = t.filter((w) => !LEGAL_WORDS.has(w));
    const add = (seq: string[]) => {
      if (seq.length === 0) return;
      if (seq.length === 1) {
        const w = seq[0];
        const isNumber = /\d/.test(w);
        if (isNumber ? w.replace(/\D/g, "").length < 5 && !/[a-z]/.test(w) : w.length < 4 || COMMON_WORDS.has(w)) return;
      } else if (seq.every((w) => COMMON_WORDS.has(w) || LEGAL_WORDS.has(w))) {
        return;
      }
      out.add(keyed(seq));
    };
    add(t);
    add(core);
    // Every run of 2+ words, so "Desert Star" is caught from "Desert Star Energy".
    for (let i = 0; i < core.length; i++) for (let j = i + 2; j <= core.length; j++) add(core.slice(i, j));
    // A distinctive single word, and long numbers inside IDs ("45821" from "Ifadah# 45821").
    // Short numbers and years ("2026" in "LFI-2026-0193") are never used on their own.
    if (core.length === 1) add(core);
    for (const w of t) {
      const digits = w.replace(/\D/g, "");
      const isYear = /^(19|20)\d\d$/.test(w);
      if (digits.length >= 5 || (t.length === 1 && digits.length >= 3 && !isYear)) out.add(keyed([w]));
    }
    // Arabic names with and without the article: "النجم" / "نجم".
    for (const w of core) if (/^ال[\u0621-\u064A]{3,}$/.test(w)) add([w.slice(2)]);
    // Distinctive single words of longer names.
    if (core.length > 1) {
      for (const w of core) {
        if (w.length >= 4 && !COMMON_WORDS.has(w) && !/\d/.test(w)) {
          out.add(keyedPart(w));
          if (/^ال/.test(w) && w.length >= 5) out.add(keyedPart(w.slice(2)));
        }
      }
    }
  }
  return [...out];
}

/** Word sequences (1-6 words) in a text that match a known hash. */
function knownMatches(text: string, hashes: Set<string>): { text: string; partial: boolean }[] {
  if (hashes.size === 0) return [];
  // Keep the original words so the reviewer sees what to fix.
  const original = text.split(/[^\p{L}\p{M}\p{N}\u0640]+/u).filter(Boolean);
  const tokens = normalizeTokens(text);
  if (tokens.length !== original.length) return []; // safety: only match when aligned
  const found: { text: string; partial: boolean }[] = [];
  for (let i = 0; i < tokens.length; i++) {
    let matched = false;
    for (let n = Math.min(6, tokens.length - i); n >= 1; n--) {
      const seq = tokens.slice(i, i + n);
      const variants = [seq];
      if (n === 1 && seq[0].startsWith("ال")) variants.push([seq[0].slice(2)]);
      if (variants.some((v) => hashes.has(keyed(v)))) {
        found.push({ text: original.slice(i, i + n).join(" "), partial: false });
        i += n - 1;
        matched = true;
        break;
      }
    }
    if (!matched && (hashes.has(keyedPart(tokens[i])) || (tokens[i].startsWith("ال") && hashes.has(keyedPart(tokens[i].slice(2)))))) {
      found.push({ text: original[i], partial: true });
    }
  }
  return found;
}

// ---------------------------------------------------------------------------
// Patterns
// ---------------------------------------------------------------------------

const ID_PATTERNS: { re: RegExp; reason: string }[] = [
  { re: /\bifad[ah]{1,2}\s*#?\s*[:\-]?\s*\d*/gi, reason: "Incident system reference (Ifadah)" },
  { re: /#\s*\d{2,}/g, reason: "Number after # (looks like a reference)" },
  {
    re: /\b(?:ref(?:erence)?|report|case|incident|permit|ptw|work\s*order|w\/?o|ticket|badge|employee|id)\s*(?:no\.?|number|#)?\s*[:#\-]?\s*[A-Z]{0,4}[-/]?\d[\dA-Z/-]{2,}/gi,
    reason: "Looks like a reference, permit or ID number",
  },
  { re: /\b[A-Z]{1,6}[-/]\d{2,}[A-Z0-9/-]*\b/g, reason: "Looks like a code or reference number" },
  { re: /\b[A-Z]{2,6}\d{3,}\b/g, reason: "Looks like a code or reference number" },
  { re: /(?<![\d.,:/-])\d{5,}(?![\d.,:/-]*\s*(?:kg|m|mm|bar|psi|tonnes?|litres?|l)\b)/g, reason: "Long number (could be an ID)" },
  {
    re: /(?:رقم|مرجع)\s*(?:البلاغ|الحادثه|الحادثة|التقرير|التصريح|الموظف|الشاره|الشارة)?\s*[:#]?\s*[0-9\u0660-\u0669][0-9\u0660-\u0669/-]{2,}/g,
    reason: "Looks like a reference or ID number",
  },
  { re: /[\w.+-]+@[\w-]+\.[\w.-]+/g, reason: "Email address" },
  { re: /\+?\d[\d\s-]{8,}\d/g, reason: "Phone or ID number" },
];

const COMPANY_PATTERNS: { re: RegExp; reason: string }[] = [
  {
    re: /\b(?:[A-Z][\w&'.-]*\s+){0,4}[A-Z][\w&'.-]*\s+(?:LLC|L\.L\.C\.?|Ltd\.?|Limited|Inc\.?|Co\.|Corp\.?|Corporation|Company|Group|Est\.?|Establishment|Industries|Holdings?|PLC|GmbH|W\.?L\.?L\.?)(?![\w])/g,
    reason: "Looks like a company name",
  },
  {
    re: /(?<![\u0621-\u064A])(?:شركة|مؤسسة|مجموعة)\s+(?!ال?مقاول|ال?مشغل|ال?عميل)[\u0621-\u064A]{2,}(?:\s+[\u0621-\u064A]{2,})?/g,
    reason: "Looks like a company name",
  },
];

// Capitalised words that are generic, so "The Company" is not a name.
const GENERIC_LEADING = /^(?:the|this|that|a|an|our|your|each|every|any|main|same)\s+/i;

function patternMatches(text: string): { text: string; kind: IssueKind; reason: string }[] {
  const out: { text: string; kind: IssueKind; reason: string }[] = [];
  for (const { re, reason } of ID_PATTERNS) {
    for (const m of text.matchAll(re)) {
      const t = m[0].trim();
      if (t.length >= 3) out.push({ text: t, kind: "id", reason });
    }
  }
  // One sentence at a time, so "Vehicle B. The Company" is not read as one name.
  const sentences = text.split(/(?<=[.!?؟])\s+(?=\p{Lu}|\p{Script=Arabic})/u);
  for (const { re, reason } of COMPANY_PATTERNS) {
    for (const m of sentences.flatMap((sentence) => [...sentence.matchAll(re)])) {
      let t = m[0].trim();
      while (GENERIC_LEADING.test(t)) t = t.replace(GENERIC_LEADING, "");
      if (t.split(/\s+/).length >= 2) out.push({ text: t, kind: "company", reason });
    }
  }
  return out;
}

/**
 * Names and IDs found by pattern in a source text, to be hashed. Used as a
 * backup to the terms Claude reports, and in demo mode.
 */
export function scanSourceForSensitiveTerms(text: string): string[] {
  return patternMatches(text).flatMap((m) =>
    m.kind === "company"
      ? [m.text]
      : // Keep only the code itself ("WP-2209" from "Permit WP-2209"), not the label words.
        (m.text.match(/[\p{L}\p{N}]*\d[\p{L}\p{N}/-]*/gu) ?? []).filter((c) => c.replace(/\D/g, "").length >= 3),
  );
}

// ---------------------------------------------------------------------------
// What gets checked
// ---------------------------------------------------------------------------

const FACT_LABELS: Record<keyof Facts, string> = {
  date: "Date",
  time: "Time",
  location: "Location",
  risk_category: "Risk category",
  injury_or_asset_damaged: "Injury / asset damaged",
  actual_severity: "Actual severity",
  potential_severity: "Potential severity",
  activity: "Activity",
};

/** Every text a video shows or says, plus the summary kept with it. */
export function storyboardTexts(sb: Storyboard): CheckedText[] {
  const fields: CheckedText[] = [
    { where: "Video title", text: sb.title },
    { where: "What happened", text: sb.what_happened },
    { where: "Key lesson / message", text: sb.key_lesson },
    ...sb.why_it_happened.map((t, i) => ({ where: `Why it happened ${i + 1}`, text: t })),
    ...sb.actions.map((t, i) => ({ where: `Action ${i + 1}`, text: t })),
    ...(sb.reflective_questions ?? []).map((t, i) => ({ where: `Reflective question ${i + 1}`, text: t })),
  ];
  if (sb.facts) {
    for (const [k, label] of Object.entries(FACT_LABELS)) {
      const v = sb.facts[k as keyof Facts];
      if (v) fields.push({ where: `Title card – ${label}`, text: v });
    }
  }
  sb.scenes.forEach((sc, i) => {
    fields.push({ where: `Scene ${i + 1} narration`, text: sc.narration, sceneId: sc.id });
    fields.push({ where: `Scene ${i + 1} caption`, text: sc.caption, sceneId: sc.id });
  });
  return fields.filter((f) => f.text?.trim());
}

const issueKey = (kind: string, text: string) => `${kind}:${normalizeTokens(text).join(" ")}`;

/** Check a list of texts (also used for the alert review form). */
export function checkTexts(texts: CheckedText[], bannedHashes: string[]): ComplianceIssue[] {
  const hashes = new Set(bannedHashes);
  const issues: ComplianceIssue[] = [];
  const seen = new Set<string>();
  const push = (i: ComplianceIssue) => {
    const k = `${i.key}|${i.where}`;
    if (!seen.has(k)) {
      seen.add(k);
      issues.push(i);
    }
  };
  for (const f of texts) {
    for (const { text: t, partial } of knownMatches(f.text, hashes)) {
      push({
        key: issueKey(partial ? "part" : "known", t),
        kind: /\d/.test(t) ? "id" : "company",
        source: partial ? "pattern" : "known",
        where: f.where,
        text: t,
        reason: partial
          ? "This word is part of a company or person name in the original file"
          : /\d/.test(t)
            ? "This number appears in the original file as an ID or reference"
            : "This name appears in the original file as a company or person name",
        sceneId: f.sceneId,
        overridable: partial,
      });
    }
    for (const m of patternMatches(f.text)) {
      push({
        key: issueKey(m.kind, m.text),
        kind: m.kind,
        source: "pattern",
        where: f.where,
        text: m.text,
        reason: m.reason,
        sceneId: f.sceneId,
        overridable: true,
      });
    }
  }
  return issues;
}

/** Pictures used in the video that may show a logo, name, plate or ID and are not checked yet. */
export function imageIssues(sb: Storyboard): ComplianceIssue[] {
  const used = new Map<string, string>();
  sb.scenes.forEach((sc, i) => (sc.images ?? []).forEach((f) => used.has(f) || used.set(f, sc.id + "|" + (i + 1))));
  return (sb.media ?? [])
    .filter((m) => m.flagged && !m.checked && used.has(m.file))
    .map((m) => {
      const [sceneId, n] = used.get(m.file)!.split("|");
      return {
        key: `image:${m.file}`,
        kind: "image" as const,
        source: "image" as const,
        where: `Scene ${n} picture`,
        text: m.description || m.file,
        reason: `Picture may show ${m.flag_reasons.join(", ") || "a logo, name, plate or ID"}. Blur it, remove it, or confirm it is safe.`,
        sceneId,
        overridable: true,
      };
    });
}

export function checkStoryboardCompliance(sb: Storyboard, bannedHashes: string[]): ComplianceIssue[] {
  return [...checkTexts(storyboardTexts(sb), bannedHashes), ...imageIssues(sb)];
}

/** Drop the false alarms a reviewer has confirmed. Known names/IDs can't be dismissed. */
export function withoutAcknowledged(issues: ComplianceIssue[], acks: string[]): ComplianceIssue[] {
  const a = new Set(acks);
  return issues.filter((i) => !i.overridable || !a.has(i.key));
}

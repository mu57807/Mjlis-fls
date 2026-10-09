// A second, local safety net for anonymisation. Claude is instructed to remove
// names, contractors, locations and ID numbers; this file looks for anything
// that may have slipped through so the reviewer can check it before approving.
// It is a heuristic: it may flag harmless words, and it cannot catch
// everything. Human review is still the final check.

import type { Storyboard } from "./schema";

export interface IdentifierFlag {
  text: string;
  reason: string;
  where: string;
}

// Common words/acronyms in HSE writing that are capitalised but not identifying.
const ALLOWED_CAPITALISED = new Set(
  [
    "PPE", "HSE", "LFI", "JSA", "JHA", "PTW", "LOTO", "SIMOPS", "TBT", "STOP",
    "H2S", "LEL", "SCBA", "MSDS", "SDS", "DROPS", "HIPO", "LTI", "MTC", "RWC",
    "FAC", "NM", "HAZID", "HAZOP", "QHSE", "CCTV", "GPS", "ID", "OK", "AM", "PM",
    "The", "A", "An", "This", "That", "These", "Those", "During", "After",
    "Before", "While", "When", "No", "Nobody", "One", "Two", "It", "He", "She",
    "They", "We", "I", "On", "At", "In", "As", "But", "And", "Or", "If", "There",
    "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
    "January", "February", "March", "April", "May", "June", "July", "August",
    "September", "October", "November", "December", "Permit", "Work",
    "Supervisor", "Operator", "Rigger", "Banksman", "Crane", "Contractor",
    "Company", "Incident", "Lesson", "Learning", "Safety", "Root", "Cause",
  ].map((w) => w.toLowerCase()),
);

const PATTERNS: { re: RegExp; reason: string }[] = [
  { re: /[\w.+-]+@[\w-]+\.[\w.-]+/g, reason: "Looks like an email address" },
  { re: /\+?\d[\d\s-]{7,}\d/g, reason: "Looks like a phone or ID number" },
  { re: /\b\d{4,}\b/g, reason: "Long number (could be an ID, permit or badge number)" },
  { re: /[٠-٩۰-۹]{4,}/g, reason: "Long number (could be an ID, permit or badge number)" },
  {
    re: /\b[A-Z]{1,6}[-/]?\d{1,}[A-Z0-9/-]*\b/g,
    reason: "Looks like a code (permit, work order, equipment tag or well/rig ID)",
  },
];

// Words that usually come right before a name.
const EN_NAME_MARKERS =
  /\b(?:Mr|Mrs|Ms|Miss|Dr|Eng|Engr|Sheikh)\.?\s+([A-Z][\w'-]+(?:\s+[A-Z][\w'-]+)?)/g;
const EN_ORG_MARKERS =
  /\b([A-Z][\w&'-]+(?:\s+[A-Z][\w&'-]+)*)\s+(?:Ltd|LLC|Inc|Co|Company|Contracting|Services|Engineering|Est)\b/g;
// Arabic letters and diacritics only (excludes Arabic punctuation such as "،").
const AR_NAME_MARKERS =
  /(?:السيد|السيدة|المهندس|المهندسة|الأستاذ|الشيخ|شركة|مؤسسة|حقل|منصة|بئر)\s+([\u0621-\u065F\u0670-\u06D3]{2,}(?:\s+[\u0621-\u065F\u0670-\u06D3]{2,})?)/g;
const AR_STOPWORDS = new Set([
  "كان", "كانت", "في", "من", "على", "إلى", "الذي", "التي", "بعد", "قبل", "أثناء", "عند", "مع", "عن", "تم", "قام",
]);

/** Collect likely names / organisations / places from the original text. */
function candidateNamesFromSource(source: string): Set<string> {
  const names = new Set<string>();

  for (const m of source.matchAll(EN_NAME_MARKERS)) names.add(m[1]);
  for (const m of source.matchAll(EN_ORG_MARKERS)) names.add(m[1]);
  for (const m of source.matchAll(AR_NAME_MARKERS)) {
    // Keep each word separately; Arabic names are often split differently later.
    for (const w of m[1].split(/\s+/)) {
      if (w.length >= 3 && !AR_STOPWORDS.has(w)) names.add(w);
    }
  }

  // Capitalised words that are not at the start of a sentence.
  const sentences = source.split(/(?<=[.!?\n])\s+/);
  for (const s of sentences) {
    const words = s.split(/\s+/).slice(1);
    for (const raw of words) {
      const w = raw.replace(/^[^\w]+|[^\w]+$/g, "");
      if (w.length < 3) continue;
      if (!/^[A-Z][a-z]/.test(w)) continue;
      if (ALLOWED_CAPITALISED.has(w.toLowerCase())) continue;
      names.add(w);
    }
  }
  return names;
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** All user-visible text fields in a storyboard, labelled for the reviewer. */
export function storyboardTextFields(sb: Storyboard): { where: string; text: string }[] {
  const fields = [
    { where: "Title", text: sb.title },
    { where: "What happened", text: sb.what_happened },
    { where: "Key lesson", text: sb.key_lesson },
    ...sb.why_it_happened.map((t, i) => ({ where: `Root cause ${i + 1}`, text: t })),
    ...sb.actions.map((t, i) => ({ where: `Action ${i + 1}`, text: t })),
  ];
  sb.scenes.forEach((sc, i) => {
    fields.push({ where: `Scene ${i + 1} narration`, text: sc.narration });
    fields.push({ where: `Scene ${i + 1} caption`, text: sc.caption });
  });
  return fields;
}

export function findPossibleIdentifiers(sb: Storyboard, sourceText: string): IdentifierFlag[] {
  const flags: IdentifierFlag[] = [];
  const seen = new Set<string>();
  const add = (f: IdentifierFlag) => {
    const key = `${f.text}|${f.where}`;
    if (!seen.has(key)) {
      seen.add(key);
      flags.push(f);
    }
  };

  const fields = storyboardTextFields(sb);
  const names = [...candidateNamesFromSource(sourceText)];

  for (const { where, text } of fields) {
    for (const { re, reason } of PATTERNS) {
      for (const m of text.matchAll(re)) add({ text: m[0].trim(), reason, where });
    }
    for (const name of names) {
      // Latin names need word boundaries; Arabic words are matched as-is.
      const re = /[A-Za-z]/.test(name)
        ? new RegExp(`\\b${escapeRegExp(name)}\\b`)
        : new RegExp(escapeRegExp(name));
      if (re.test(text)) {
        add({
          text: name,
          reason: "Appears in the original description as a possible name, company or place",
          where,
        });
      }
    }
  }
  return flags;
}

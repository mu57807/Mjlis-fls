// The APP RULES check for an alert's review form (before a storyboard is made).
import type { CheckedText, ComplianceIssue } from "../compliance";
import { checkTexts } from "../compliance";
import { HEADER_KEYS, HEADER_LABELS, type AlertFields, type AlertPicture } from "./types";

export function alertTexts(f: AlertFields): CheckedText[] {
  return [
    ...HEADER_KEYS.map((k) => ({ where: HEADER_LABELS[k], text: f[k] })),
    { where: "What happened", text: f.what_happened },
    { where: "Key message", text: f.key_message },
    ...f.why_findings.map((t, i) => ({ where: `Finding ${i + 1}`, text: t })),
    ...f.sustain_actions.map((t, i) => ({ where: `Sustain ${i + 1}`, text: t })),
    ...f.reflective_questions.map((t, i) => ({ where: `Question ${i + 1}`, text: t })),
  ].filter((t) => t.text.trim());
}

export function pictureIssues(pictures: AlertPicture[]): ComplianceIssue[] {
  return pictures
    .filter((p) => p.use && p.flagged && !p.checked)
    .map((p) => ({
      key: `image:${p.id}`,
      kind: "image" as const,
      source: "image" as const,
      where: `Picture ${pictures.indexOf(p) + 1}`,
      text: p.description || p.file,
      reason: `May show ${p.flag_reasons.join(", ") || "a logo, name, plate or ID"}. Blur it, stop using it, or confirm it is safe.`,
      overridable: true,
    }));
}

export function checkAlert(fields: AlertFields, pictures: AlertPicture[], bannedHashes: string[]) {
  return [...checkTexts(alertTexts(fields), bannedHashes), ...pictureIssues(pictures)];
}

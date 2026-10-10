import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { ALERT_SCENE_ORDER, ICONS, type Language } from "../catalog";
import type { AlertFields } from "../alerts/types";
import { HEADER_KEYS } from "../alerts/types";
import type { Media, Scene, Storyboard } from "../schema";
import { fitDurations } from "../storyboard-checks";
import { askClaude } from "./client";
import { buildAlertStoryboardSystem } from "./alert-prompts";

const AlertStoryboardSchema = z.object({
  title: z.string(),
  facts: z.object({
    date: z.string(),
    time: z.string(),
    location: z.string(),
    risk_category: z.string(),
    injury_or_asset_damaged: z.string(),
    actual_severity: z.string(),
    potential_severity: z.string(),
    activity: z.string(),
  }),
  what_happened: z.string(),
  why_it_happened: z.array(z.string()),
  key_lesson: z.string(),
  actions: z.array(z.string()),
  reflective_questions: z.array(z.string()),
  scenes: z.array(
    z.object({
      visual_type: z.enum(ALERT_SCENE_ORDER),
      narration: z.string(),
      caption: z.string(),
      icons: z.array(z.enum(ICONS)),
      duration_seconds: z.number(),
    }),
  ),
});

const MISSING_LABELS: Record<Language, Record<string, string>> = {
  en: {
    incident_title: "Incident title", date: "Date", time: "Time", risk_category: "Risk category",
    injury_or_asset_damaged: "Injury / asset damaged", actual_severity: "Actual severity",
    potential_severity: "Potential severity", activity: "Activity", location: "Location",
    what_happened: "What happened", why_findings: "Why it happened / findings",
    reflective_questions: "Reflective questions", sustain_actions: "How to sustain the learning",
    key_message: "Key message",
  },
  ar: {
    incident_title: "عنوان الحادثة", date: "التاريخ", time: "الوقت", risk_category: "فئة الخطر",
    injury_or_asset_damaged: "الإصابة / الضرر", actual_severity: "الخطورة الفعلية",
    potential_severity: "الخطورة المحتملة", activity: "النشاط", location: "الموقع",
    what_happened: "ماذا حدث", why_findings: "لماذا حدث / النتائج",
    reflective_questions: "أسئلة للنقاش", sustain_actions: "كيفية استدامة التعلّم",
    key_message: "الرسالة الأساسية",
  },
};

/**
 * Reviewed alert fields -> storyboard in the fixed order:
 * title -> what happened (+ photos) -> why -> key message -> sustain -> questions -> closing.
 */
export async function buildAlertStoryboard(opts: {
  fields: AlertFields;
  notes: string[];
  language: Language;
  targetSeconds: number;
  media: Media[];
}): Promise<Storyboard> {
  const { fields, language } = opts;
  const raw = await askClaude({
    schema: AlertStoryboardSchema,
    system: buildAlertStoryboardSystem(),
    what: "storyboard",
    content: `Output language: ${language === "ar" ? "Arabic (Modern Standard Arabic)" : "English"}
Total video length: ${opts.targetSeconds} seconds
Incident pictures shown in the "what happened" scene: ${opts.media.length}

<alert>
${JSON.stringify(fields, null, 2)}
</alert>`,
  });

  // Content that is empty in the alert never gets a scene (nothing is invented).
  const hasContent: Record<string, boolean> = {
    root_cause: fields.why_findings.length > 0,
    key_lesson: fields.key_message.trim() !== "",
    sustain: fields.sustain_actions.length > 0,
    reflective_questions: fields.reflective_questions.length > 0,
    what_happened: fields.what_happened.trim() !== "" || opts.media.length > 0,
  };
  const order = (t: string) => ALERT_SCENE_ORDER.indexOf(t as (typeof ALERT_SCENE_ORDER)[number]);
  let scenes: Scene[] = raw.scenes
    .filter((s) => hasContent[s.visual_type] !== false)
    .map((s, i) => ({ s, i }))
    .sort((a, b) => order(a.s.visual_type) - order(b.s.visual_type) || a.i - b.i)
    .map(({ s }) => ({
      ...s,
      id: randomUUID(),
      narration: s.narration.trim(),
      caption: s.caption.trim(),
      icons: [...new Set(s.icons)].slice(0, 4),
      images: [] as string[],
      duration_seconds: Number.isFinite(s.duration_seconds) && s.duration_seconds > 0 ? s.duration_seconds : 8,
    }));

  // The incident pictures are shown during "what happened".
  const wh = scenes.filter((s) => s.visual_type === "what_happened");
  const files = opts.media.map((m) => m.file);
  if (wh.length > 0) {
    const per = Math.ceil(files.length / wh.length);
    wh.forEach((s, k) => (s.images = files.slice(k * per, k * per + per)));
  }
  scenes = fitDurations(scenes, opts.targetSeconds);

  const labels = MISSING_LABELS[language];
  const missing = [
    ...HEADER_KEYS.filter((k) => !fields[k].trim()).map((k) => labels[k]),
    ...(["what_happened", "key_message"] as const).filter((k) => !fields[k].trim()).map((k) => labels[k]),
    ...(["why_findings", "reflective_questions", "sustain_actions"] as const)
      .filter((k) => fields[k].length === 0)
      .map((k) => labels[k]),
  ];

  return {
    title: raw.title.trim() || fields.incident_title,
    language,
    source: "alert",
    facts: raw.facts,
    what_happened: raw.what_happened,
    why_it_happened: raw.why_it_happened,
    key_lesson: raw.key_lesson,
    actions: raw.actions,
    reflective_questions: raw.reflective_questions,
    missing_information: missing,
    anonymisation_notes: opts.notes,
    media: opts.media,
    scenes,
  };
}

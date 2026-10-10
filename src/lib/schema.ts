import { z } from "zod";
import {
  ASPECT_RATIOS,
  ICONS,
  LANGUAGES,
  TARGET_LENGTHS,
  TEXT_VISUAL_TYPES,
  VISUAL_TYPES,
} from "./catalog";
import type { AudioManifest } from "./video";

// ---------------------------------------------------------------------------
// What we ask Claude to return. Kept free of numeric/length limits because the
// structured-output feature does not support them; we check those ourselves
// in storyboard-checks.ts after the reply arrives.
// ---------------------------------------------------------------------------
export const ClaudeSceneSchema = z.object({
  visual_type: z.enum(TEXT_VISUAL_TYPES),
  narration: z.string().describe("What the voiceover says in this scene."),
  caption: z.string().describe("Short on-screen text, max ~8 words."),
  icons: z.array(z.enum(ICONS)).describe("0-4 icons from the fixed list."),
  duration_seconds: z.number().describe("Scene length in seconds."),
});

export const ClaudeStoryboardSchema = z.object({
  title: z.string(),
  what_happened: z.string(),
  why_it_happened: z.array(z.string()).describe("Root causes, one per item."),
  key_lesson: z.string(),
  actions: z.array(z.string()).describe("What to do differently, one per item."),
  missing_information: z
    .array(z.string())
    .describe("Facts a good LFI needs that the description does not state."),
  anonymisation_notes: z
    .array(z.string())
    .describe("Generic notes on what kind of details were removed."),
  scenes: z.array(ClaudeSceneSchema),
  sensitive_terms: z
    .array(z.string())
    .describe(
      "Every company/brand/organisation name, person name and ID/reference number found in the SOURCE text, exactly as written. Used only to check the output automatically; never shown.",
    ),
});
export type ClaudeStoryboard = z.infer<typeof ClaudeStoryboardSchema>;

// ---------------------------------------------------------------------------
// What the app stores and edits. Same shape plus a stable id per scene and the
// output language.
// ---------------------------------------------------------------------------
export const SceneSchema = ClaudeSceneSchema.extend({
  id: z.string().min(1),
  visual_type: z.enum(VISUAL_TYPES),
  /** Pictures shown in this scene (file names from storyboard.media). */
  images: z.array(z.string()).default([]),
  narration: z.string().trim().min(1, "Narration cannot be empty"),
  caption: z.string().trim(),
  duration_seconds: z.number().min(2).max(40),
});
export type Scene = z.infer<typeof SceneSchema>;

/** Header facts shown on the title card (videos made from an alert file). */
export const FactsSchema = z.object({
  date: z.string().default(""),
  time: z.string().default(""),
  location: z.string().default(""),
  risk_category: z.string().default(""),
  injury_or_asset_damaged: z.string().default(""),
  actual_severity: z.string().default(""),
  potential_severity: z.string().default(""),
  activity: z.string().default(""),
});
export type Facts = z.infer<typeof FactsSchema>;

/** A picture available to the video, with its privacy check state. */
export const MediaSchema = z.object({
  file: z.string().regex(/^[\w-]+\.(jpg|png)$/),
  description: z.string().default(""),
  /** May show a logo, company name, vehicle plate or ID. */
  flagged: z.boolean().default(false),
  flag_reasons: z.array(z.string()).default([]),
  /** A person confirmed it is safe (or blurred it). */
  checked: z.boolean().default(false),
});
export type Media = z.infer<typeof MediaSchema>;

export const StoryboardSchema = ClaudeStoryboardSchema.omit({ sensitive_terms: true }).extend({
  language: z.enum(LANGUAGES),
  title: z.string().trim().min(1, "Title cannot be empty"),
  scenes: z.array(SceneSchema).min(1, "Keep at least one scene").max(12),
  /** Where the content came from. */
  source: z.enum(["text", "alert"]).default("text"),
  facts: FactsSchema.optional(),
  reflective_questions: z.array(z.string()).default([]),
  media: z.array(MediaSchema).default([]),
});
export type Storyboard = z.infer<typeof StoryboardSchema>;

export const OUTPUT_LANGUAGE_CHOICES = ["en", "ar", "both"] as const;

export const CreateRequestSchema = z.object({
  description: z
    .string()
    .trim()
    .min(40, "Please paste a fuller incident description (at least a few sentences).")
    .max(20000, "Description is too long (max 20,000 characters)."),
  outputLanguage: z.enum(OUTPUT_LANGUAGE_CHOICES),
  aspectRatio: z.enum(ASPECT_RATIOS),
  targetSeconds: z.union(TARGET_LENGTHS.map((n) => z.literal(n)) as [
    z.ZodLiteral<60>,
    z.ZodLiteral<90>,
  ]),
});
export type CreateRequest = z.infer<typeof CreateRequestSchema>;

export const PROJECT_STATUSES = [
  "draft",
  "approved",
  "rendering",
  "done",
  "failed",
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export interface Project {
  id: string;
  batchId: string;
  createdAt: string;
  updatedAt: string;
  status: ProjectStatus;
  language: (typeof LANGUAGES)[number];
  aspectRatio: (typeof ASPECT_RATIOS)[number];
  targetSeconds: 60 | 90;
  sourceText: string;
  storyboard: Storyboard;
  approvedAt: string | null;
  demo: boolean;
  /** Voiceover clips per scene id, if generated. */
  audio: AudioManifest | null;
  render: RenderInfo;
  /** Where the incident came from. */
  origin: "web" | "api" | "whatsapp";
  /** WhatsApp number (for origin "whatsapp"). */
  originContact: string | null;
  /** URL notified when the video is ready (for origin "api"). */
  callbackUrl: string | null;
  /** The uploaded alert this video was made from, if any. */
  alertId: string | null;
  compliance: {
    /** Keys of findings a reviewer confirmed are false alarms. */
    acknowledged: string[];
    lastCheck: ComplianceResult | null;
  };
}

/** Result of the final check that runs before every render. */
export interface ComplianceResult {
  checkedAt: string;
  /** Problems that block the render (false alarms already removed). */
  issues: import("./compliance").ComplianceIssue[];
  /** Whether Claude's second reading ran (needs an API key). */
  aiChecked: boolean;
}

export interface RenderInfo {
  stage: string | null;
  progress: number;
  error: string | null;
  startedAt: string | null;
  videoFile: string | null;
  thumbFile: string | null;
  videoSeconds: number | null;
  renderedAt: string | null;
}

export type ProjectSummary = Omit<Project, "sourceText" | "storyboard" | "audio"> & {
  title: string;
  sceneCount: number;
};

/** A storyboard as written by Claude or a sample, before scene ids and defaults. */
export type RawStoryboard = Omit<ClaudeStoryboard, "sensitive_terms">;

/** Fill in scene ids and the fields that text-based storyboards leave empty. */
export function completeStoryboard(
  raw: RawStoryboard,
  language: (typeof LANGUAGES)[number],
  makeId: (index: number) => string = (i) => `s${i}`,
): Storyboard {
  return {
    ...raw,
    language,
    source: "text",
    reflective_questions: [],
    media: [],
    scenes: raw.scenes.map((s, i) => ({ ...s, id: makeId(i), images: [] })),
  };
}

import { z } from "zod";
import {
  ASPECT_RATIOS,
  ICONS,
  LANGUAGES,
  TARGET_LENGTHS,
  VISUAL_TYPES,
} from "./catalog";
import type { AudioManifest } from "./video";

// ---------------------------------------------------------------------------
// What we ask Claude to return. Kept free of numeric/length limits because the
// structured-output feature does not support them; we check those ourselves
// in storyboard-checks.ts after the reply arrives.
// ---------------------------------------------------------------------------
export const ClaudeSceneSchema = z.object({
  visual_type: z.enum(VISUAL_TYPES),
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
});
export type ClaudeStoryboard = z.infer<typeof ClaudeStoryboardSchema>;

// ---------------------------------------------------------------------------
// What the app stores and edits. Same shape plus a stable id per scene and the
// output language.
// ---------------------------------------------------------------------------
export const SceneSchema = ClaudeSceneSchema.extend({
  id: z.string().min(1),
  narration: z.string().trim().min(1, "Narration cannot be empty"),
  caption: z.string().trim(),
  duration_seconds: z.number().min(2).max(40),
});
export type Scene = z.infer<typeof SceneSchema>;

export const StoryboardSchema = ClaudeStoryboardSchema.extend({
  language: z.enum(LANGUAGES),
  title: z.string().trim().min(1, "Title cannot be empty"),
  scenes: z.array(SceneSchema).min(1, "Keep at least one scene").max(10),
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

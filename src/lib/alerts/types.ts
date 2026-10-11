import { z } from "zod";

/** Header fields of the standard LFI alert template (ID/reference fields are never read). */
export const HEADER_KEYS = [
  "incident_title",
  "date",
  "time",
  "risk_category",
  "injury_or_asset_damaged",
  "actual_severity",
  "potential_severity",
  "activity",
  "location",
] as const;
export type HeaderKey = (typeof HEADER_KEYS)[number];

export const HEADER_LABELS: Record<HeaderKey, string> = {
  incident_title: "Incident title",
  date: "Date",
  time: "Time",
  risk_category: "Risk category",
  injury_or_asset_damaged: "Injury / asset damaged",
  actual_severity: "Actual severity",
  potential_severity: "Potential severity",
  activity: "Activity",
  location: "Location",
};

export const AlertFieldsSchema = z.object({
  incident_title: z.string(),
  date: z.string(),
  time: z.string(),
  risk_category: z.string(),
  injury_or_asset_damaged: z.string(),
  actual_severity: z.string(),
  potential_severity: z.string(),
  activity: z.string(),
  location: z.string(),
  what_happened: z.string().describe('The "What happened?" paragraph.'),
  why_findings: z.array(z.string()).describe('"Why it happened / Findings" bullets, one per item.'),
  reflective_questions: z.array(z.string()).describe('"Reflective questions to discuss with your Team" bullets.'),
  sustain_actions: z.array(z.string()).describe('"How can this learning be sustained at site?" bullets.'),
  key_message: z.string().describe("The one-line key message under the main picture."),
});
export type AlertFields = z.infer<typeof AlertFieldsSchema>;

export const PICTURE_KINDS = [
  "incident_photo",
  "diagram",
  "logo_or_branding",
  "decoration",
  "document_or_page",
  "other",
] as const;
export type PictureKind = (typeof PICTURE_KINDS)[number];

export const PICTURE_KIND_LABELS: Record<PictureKind, string> = {
  incident_photo: "Incident photo",
  diagram: "Diagram",
  logo_or_branding: "Logo / branding",
  decoration: "Decoration",
  document_or_page: "Page or document",
  other: "Other",
};

export const AlertPictureSchema = z.object({
  id: z.string().regex(/^[\w-]+$/),
  /** Current file (after any blur). */
  file: z.string().regex(/^[\w-]+\.jpg$/),
  /** The picture as extracted, kept until it is blurred. */
  original_file: z.string().regex(/^[\w-]+\.jpg$/).nullable(),
  width: z.number(),
  height: z.number(),
  source: z.string(),
  kind: z.enum(PICTURE_KINDS),
  description: z.string(),
  /** May show a company logo, name, vehicle plate or ID. */
  flagged: z.boolean(),
  flag_reasons: z.array(z.string()),
  /** A reviewer confirmed it is safe to use. */
  checked: z.boolean(),
  blurred: z.boolean(),
  /** Include in the video. */
  use: z.boolean(),
});
export type AlertPicture = z.infer<typeof AlertPictureSchema>;

export interface Alert {
  id: string;
  createdAt: string;
  updatedAt: string;
  /** "text" = typed on the New LFI page. */
  fileType: "pdf" | "pptx" | "text";
  documentLanguage: "en" | "ar";
  fields: AlertFields;
  pictures: AlertPicture[];
  /** Generic notes on what was removed ("Removed 2 company names"). */
  notes: string[];
  projectIds: string[];
}

export function emptyFields(): AlertFields {
  return {
    incident_title: "",
    date: "",
    time: "",
    risk_category: "",
    injury_or_asset_damaged: "",
    actual_severity: "",
    potential_severity: "",
    activity: "",
    location: "",
    what_happened: "",
    why_findings: [],
    reflective_questions: [],
    sustain_actions: [],
    key_message: "",
  };
}

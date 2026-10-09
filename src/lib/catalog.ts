// Fixed lists that Claude must choose from. Every entry here maps to
// something we can actually draw, so a storyboard can never ask for a
// template or icon that does not exist.

export const VISUAL_TYPES = [
  "title_card",
  "what_happened",
  "root_cause",
  "key_lesson",
  "checklist",
  "closing_card",
] as const;
export type VisualType = (typeof VISUAL_TYPES)[number];

// Reserved for the future "AI-generated incident clip" feature. Not offered
// to Claude or the editor yet; listed so the data model already has a slot.
export const FUTURE_VISUAL_TYPES = ["ai_incident_clip"] as const;

export const VISUAL_TYPE_LABELS: Record<VisualType, { en: string; hint: string }> = {
  title_card: { en: "Title card", hint: "Opening title of the video" },
  what_happened: { en: "What happened", hint: "The event, shown with icons" },
  root_cause: { en: "Root cause", hint: "Why it happened" },
  key_lesson: { en: "Key lesson", hint: "The one thing to remember, highlighted" },
  checklist: { en: "Do this instead", hint: "Checklist of actions" },
  closing_card: { en: "Closing card", hint: "Logo and closing message" },
};

export const ICONS = [
  "hard_hat",
  "safety_glasses",
  "gloves",
  "hearing_protection",
  "safety_boots",
  "harness",
  "ppe",
  "scaffold",
  "lifting",
  "forklift",
  "vehicle",
  "tools",
  "hammer",
  "drill",
  "pipe_valve",
  "pressure",
  "gas_cylinder",
  "fire",
  "explosion",
  "gas_leak",
  "chemical",
  "electrical",
  "isolation_lock",
  "weather_wind",
  "heat",
  "warning",
  "stop",
  "barrier",
  "line_of_fire",
  "dropped_object",
  "permit",
  "checklist",
  "inspection",
  "supervisor",
  "worker",
  "team",
  "communication",
  "radio",
  "first_aid",
  "medical",
  "time_pressure",
  "lesson",
  "near_miss",
] as const;
export type IconName = (typeof ICONS)[number];

export const ICON_LABELS: Record<IconName, string> = {
  hard_hat: "Hard hat",
  safety_glasses: "Safety glasses",
  gloves: "Gloves / hands",
  hearing_protection: "Hearing protection",
  safety_boots: "Safety boots",
  harness: "Harness / lanyard / tether",
  ppe: "PPE (general)",
  scaffold: "Scaffold / work at height",
  lifting: "Lifting / crane load",
  forklift: "Forklift",
  vehicle: "Vehicle / truck",
  tools: "Hand tools / wrench",
  hammer: "Hammer",
  drill: "Power tool / drill",
  pipe_valve: "Pipework / valve",
  pressure: "Pressure / gauge",
  gas_cylinder: "Gas cylinder",
  fire: "Fire",
  explosion: "Explosion",
  gas_leak: "Gas leak / release",
  chemical: "Chemical",
  electrical: "Electrical",
  isolation_lock: "Isolation / lock-out",
  weather_wind: "Wind / weather",
  heat: "Heat / temperature",
  warning: "Warning",
  stop: "Stop work",
  barrier: "Barrier / exclusion zone",
  line_of_fire: "Line of fire",
  dropped_object: "Dropped object",
  permit: "Permit to work",
  checklist: "Checklist",
  inspection: "Inspection / check",
  supervisor: "Supervisor",
  worker: "Worker",
  team: "Team / crew",
  communication: "Communication / toolbox talk",
  radio: "Radio",
  first_aid: "First aid",
  medical: "Medical / injury",
  time_pressure: "Time pressure",
  lesson: "Lesson / idea",
  near_miss: "Near miss",
};

export const LANGUAGES = ["en", "ar"] as const;
export type Language = (typeof LANGUAGES)[number];

export const ASPECT_RATIOS = ["16:9", "9:16"] as const;
export type AspectRatio = (typeof ASPECT_RATIOS)[number];

export const TARGET_LENGTHS = [60, 90] as const;
export type TargetLength = (typeof TARGET_LENGTHS)[number];

// Comfortable narration speed for training videos (words per second).
// Used to warn when a scene has too much text for its duration.
export const WORDS_PER_SECOND: Record<Language, number> = { en: 2.4, ar: 2.0 };

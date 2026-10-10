import { brand } from "@brand";
import type { Language, VisualType } from "@/lib/catalog";

export const C = brand.colors;

export function fontFamily(lang: Language) {
  const latin = `"${brand.fonts.latin}"`;
  const arabic = `"${brand.fonts.arabic}"`;
  return lang === "ar" ? `${arabic}, ${latin}, sans-serif` : `${latin}, ${arabic}, sans-serif`;
}

/** Letter spacing breaks Arabic letter joining, so only use it for Latin text. */
export function tracking(lang: Language, em: number) {
  return lang === "ar" ? 0 : `${em}em`;
}

export const HEADER_LABEL: Record<Language, string> = {
  en: "LEARNING FROM INCIDENT",
  ar: "التعلّم من الحوادث",
};

export const SCENE_LABEL: Record<VisualType, Record<Language, string>> = {
  title_card: { en: "", ar: "" },
  what_happened: { en: "WHAT HAPPENED", ar: "ماذا حدث" },
  root_cause: { en: "WHY IT HAPPENED", ar: "لماذا حدث" },
  key_lesson: { en: "KEY LESSON", ar: "الدرس المستفاد" },
  checklist: { en: "DO THIS INSTEAD", ar: "افعل هذا بدلاً من ذلك" },
  sustain: { en: "SUSTAIN THE LEARNING", ar: "استدامة التعلّم" },
  reflective_questions: { en: "DISCUSS WITH YOUR TEAM", ar: "ناقش مع فريقك" },
  closing_card: { en: "", ar: "" },
};

export const HAZARD_STRIPES = `repeating-linear-gradient(135deg, ${C.accent} 0 28px, ${C.primary} 28px 56px)`;

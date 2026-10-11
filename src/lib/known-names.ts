// The "known names" list: company, person and place names that the local
// clean-up removes from every incident before anything is sent to Claude.
// Kept by the HSE team on the Names list page.

export const KNOWN_NAME_KINDS = ["company", "person", "place"] as const;
export type KnownNameKind = (typeof KNOWN_NAME_KINDS)[number];

export interface KnownName {
  id: string;
  term: string;
  kind: KnownNameKind;
  /** What the name is replaced with ("the contractor", "the site"). */
  replacement: string;
}

export const KNOWN_NAME_KIND_LABELS: Record<KnownNameKind, string> = {
  company: "Company / brand",
  person: "Person",
  place: "Place (site, field, rig, well, plant, city)",
};

const isArabic = (s: string) => /[\u0600-\u06FF]/.test(s);

/** Neutral word used when no replacement is given. */
export function defaultReplacement(kind: KnownNameKind, term: string): string {
  const ar = isArabic(term);
  if (kind === "company") return ar ? "الشركة" : "the company";
  if (kind === "person") return ar ? "أحد العاملين" : "a worker";
  return ar ? "الموقع" : "the site";
}

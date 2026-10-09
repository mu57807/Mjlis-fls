// =============================================================================
// BRANDING - the one file to edit to change the look of the app and videos.
// =============================================================================
// Logo: put your file in /public/brand/ and update `logo` below.
//       SVG or PNG with a transparent background works best.
// Colours: any CSS colour (hex codes like "#0B2545" are easiest).
// Fonts: the families below are bundled with the app (no internet needed).
//        To use a different font, ask a developer to add it to the project.
// =============================================================================

export const brand = {
  appName: "LFI Video Studio",
  companyName: "Your Company",

  /** Path under /public. Used in the app header and on video title/closing cards. */
  logo: "/brand/logo.svg",

  colors: {
    /** Main brand colour: header, title cards. */
    primary: "#0B2545",
    /** Lighter shade of the primary colour, for panels and gradients. */
    primarySoft: "#13315C",
    /** Safety highlight: key-lesson highlight, buttons, warnings. */
    accent: "#F26419",
    /** Very light accent, for backgrounds behind highlighted text. */
    accentSoft: "#FDEBDD",
    /** Page and video background. */
    background: "#F4F6F9",
    surface: "#FFFFFF",
    text: "#0F172A",
    mutedText: "#5B6475",
    success: "#15803D",
    danger: "#B42318",
  },

  fonts: {
    /** Latin text (English). */
    latin: "Inter",
    /** Arabic text. Must support Arabic script. */
    arabic: "Noto Kufi Arabic",
  },

  /** Font files used inside the videos (under /public). Must match the families above. */
  fontFiles: {
    latin: {
      regular: "/fonts/inter-latin-400-normal.woff2",
      bold: "/fonts/inter-latin-700-normal.woff2",
    },
    arabic: {
      regular: "/fonts/noto-kufi-arabic-arabic-400-normal.woff2",
      bold: "/fonts/noto-kufi-arabic-arabic-700-normal.woff2",
    },
  },

  /** Default closing-card line when a storyboard has none. */
  closingMessage: {
    en: "Safety is everyone's responsibility.",
    ar: "السلامة مسؤولية الجميع.",
  },
} as const;

export type Brand = typeof brand;

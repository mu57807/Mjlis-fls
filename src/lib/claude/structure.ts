import "server-only";
import { randomUUID } from "node:crypto";
import { ICONS, type Language } from "../catalog";
import { ClaudeStoryboardSchema, completeStoryboard, type ClaudeStoryboard, type RawStoryboard, type Storyboard } from "../schema";
import { hashTerms, scanSourceForSensitiveTerms } from "../compliance";
import { fitDurations, totalDuration } from "../storyboard-checks";
import { DEMO_STORYBOARDS } from "@/samples/demo-storyboards";
import { matchSample } from "@/samples/incidents";
import { SYSTEM_PROMPT, buildUserMessage } from "./prompt";
import { StructuringError, askClaude, isDemoMode } from "./client";

export { StructuringError, isDemoMode } from "./client";

function callClaude(description: string, language: Language, targetSeconds: number): Promise<ClaudeStoryboard> {
  return askClaude({
    schema: ClaudeStoryboardSchema,
    system: SYSTEM_PROMPT,
    content: buildUserMessage({ description, language, targetSeconds }),
    what: "storyboard",
  });
}

/** Turn Claude's raw reply (or a demo sample) into a storyboard the app can store and edit. */
export function finaliseStoryboard(raw: RawStoryboard, language: Language, targetSeconds: number): Storyboard {
  const sb = completeStoryboard(raw, language, () => randomUUID());
  let scenes = sb.scenes.map((s) => ({
    ...s,
    narration: s.narration.trim(),
    caption: s.caption.trim(),
    icons: [...new Set(s.icons)].filter((i) => ICONS.includes(i)).slice(0, 4),
    duration_seconds: Number.isFinite(s.duration_seconds) && s.duration_seconds > 0 ? s.duration_seconds : 8,
  }));
  if (Math.abs(totalDuration(scenes) - targetSeconds) > 1) {
    scenes = fitDurations(scenes, targetSeconds);
  }
  return { ...sb, scenes };
}

/**
 * Description -> storyboard for one output language, plus hashes of the
 * names and IDs found in the description (for the final check before rendering).
 */
export async function structureIncident(opts: {
  description: string;
  language: Language;
  targetSeconds: number;
}): Promise<{ storyboard: Storyboard; demo: boolean; bannedHashes: string[] }> {
  const fromSource = scanSourceForSensitiveTerms(opts.description);
  if (isDemoMode()) {
    const sample = matchSample(opts.description);
    if (!sample) {
      throw new StructuringError(
        "Demo mode is on, so only the built-in sample incidents can be used. Click one of the 'Load sample' buttons, or add a Claude API key and set LFI_DEMO_MODE=false.",
      );
    }
    const raw = structuredClone(DEMO_STORYBOARDS[sample.id][opts.language]);
    return {
      storyboard: finaliseStoryboard(raw, opts.language, opts.targetSeconds),
      demo: true,
      bannedHashes: hashTerms(fromSource),
    };
  }
  // The names/IDs Claude found are hashed straight away and never stored as text.
  const { sensitive_terms, ...raw } = await callClaude(opts.description, opts.language, opts.targetSeconds);
  return {
    storyboard: finaliseStoryboard(raw, opts.language, opts.targetSeconds),
    demo: false,
    bannedHashes: hashTerms([...sensitive_terms, ...fromSource]),
  };
}

// Quality checks shown on the review screen. Pure functions, so they run both
// on the server (right after Claude replies) and live in the browser while
// the user edits.

import { WORDS_PER_SECOND, type Language } from "./catalog";
import { findPossibleIdentifiers, type IdentifierFlag } from "./anonymise";
import type { Scene, Storyboard } from "./schema";

export interface StoryboardWarning {
  level: "info" | "warn";
  message: string;
  sceneId?: string;
}

export interface StoryboardReport {
  totalSeconds: number;
  warnings: StoryboardWarning[];
  identifiers: IdentifierFlag[];
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Seconds the narration needs at a comfortable speaking pace. */
export function estimateSpeechSeconds(text: string, lang: Language): number {
  return countWords(text) / WORDS_PER_SECOND[lang];
}

export function totalDuration(scenes: Pick<Scene, "duration_seconds">[]): number {
  return scenes.reduce((sum, s) => sum + s.duration_seconds, 0);
}

/**
 * Scale scene lengths so they add up to the target, rounded to half seconds,
 * with a 3-second minimum per scene. Used when Claude's numbers drift.
 */
export function fitDurations<T extends Pick<Scene, "duration_seconds">>(
  scenes: T[],
  targetSeconds: number,
): T[] {
  const current = totalDuration(scenes);
  if (scenes.length === 0 || current <= 0) return scenes;
  const factor = targetSeconds / current;
  const scaled = scenes.map((s) => ({
    ...s,
    duration_seconds: Math.max(3, Math.round(s.duration_seconds * factor * 2) / 2),
  }));
  // Put any rounding difference on the longest scene.
  const diff = targetSeconds - totalDuration(scaled);
  if (diff !== 0) {
    let longest = 0;
    scaled.forEach((s, i) => {
      if (s.duration_seconds > scaled[longest].duration_seconds) longest = i;
    });
    scaled[longest].duration_seconds = Math.max(3, scaled[longest].duration_seconds + diff);
  }
  return scaled;
}

export function checkStoryboard(
  sb: Storyboard,
  targetSeconds: number,
  sourceText: string,
): StoryboardReport {
  const warnings: StoryboardWarning[] = [];
  const total = totalDuration(sb.scenes);

  if (Math.abs(total - targetSeconds) > targetSeconds * 0.1) {
    warnings.push({
      level: "warn",
      message: `Total length is ${total}s but the target is ${targetSeconds}s. Adjust scene durations or use "Fit to ${targetSeconds}s".`,
    });
  }
  if (sb.scenes.length < 5 || sb.scenes.length > 7) {
    warnings.push({
      level: "info",
      message: `There are ${sb.scenes.length} scenes. 5–7 scenes usually works best.`,
    });
  }
  if (sb.scenes[0] && sb.scenes[0].visual_type !== "title_card") {
    warnings.push({ level: "info", message: "The first scene is usually a title card." });
  }
  const last = sb.scenes[sb.scenes.length - 1];
  if (last && last.visual_type !== "closing_card") {
    warnings.push({ level: "info", message: "The last scene is usually a closing card." });
  }

  sb.scenes.forEach((sc, i) => {
    const need = estimateSpeechSeconds(sc.narration, sb.language);
    if (need > sc.duration_seconds * 1.1) {
      warnings.push({
        level: "warn",
        sceneId: sc.id,
        message: `Scene ${i + 1}: the narration needs about ${Math.ceil(need)}s to read aloud but the scene is ${sc.duration_seconds}s. Shorten the text or lengthen the scene.`,
      });
    }
    if (countWords(sc.caption) > 10) {
      warnings.push({
        level: "info",
        sceneId: sc.id,
        message: `Scene ${i + 1}: the caption is long (${countWords(sc.caption)} words). Short captions are easier to read on a phone.`,
      });
    }
  });

  return {
    totalSeconds: total,
    warnings,
    identifiers: findPossibleIdentifiers(sb, sourceText),
  };
}

import type { Language } from "../catalog";
import type { WordTiming } from "../video";

export interface TtsResult {
  audio: Buffer;
  /** File extension of `audio`. */
  extension: "mp3";
  durationSec: number;
  /** Word timings in seconds from the start of the clip. */
  words: WordTiming[];
}

/** A text-to-speech service. Add a new provider by implementing this. */
export interface TtsProvider {
  id: string;
  /** Voice used for a language (shown in the UI and part of the cache key). */
  voice(lang: Language): string;
  synthesize(text: string, lang: Language): Promise<TtsResult>;
}

/** An error whose message is safe to show to the user. */
export class TtsError extends Error {}

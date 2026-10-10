// Shared, pure video logic: timing of scenes and subtitles. Used by the
// browser preview, the render worker and the Remotion composition, so all
// three always agree on what happens when.

import type { AspectRatio, Language } from "./catalog";
import type { Storyboard } from "./schema";
import { WORDS_PER_SECOND } from "./catalog";

export const FPS = 30;

/** Seconds of silence after the voiceover before the next scene starts. */
const AUDIO_TAIL_SECONDS = 0.8;
/** Seconds before the voiceover starts in each scene. */
export const AUDIO_LEAD_SECONDS = 0.3;

export interface WordTiming {
  text: string;
  /** Seconds from the start of the voiceover clip. */
  start: number;
  end: number;
}

export interface SceneAudio {
  /** File name inside the project's audio folder. */
  file: string;
  /** The narration this audio was made from (to detect stale audio after edits). */
  text: string;
  durationSec: number;
  words: WordTiming[];
}

export type AudioManifest = Record<string, SceneAudio>;

export type VideoProps = {
  storyboard: Storyboard;
  aspectRatio: AspectRatio;
  /** Voiceover per scene id, or null for a silent video. */
  audio: AudioManifest | null;
  /**
   * URL prefix for audio files. The browser preview passes the API URL;
   * the renderer passes null and the files are served as static files.
   */
  audioBase: string | null;
  /** URL prefix for pictures (preview), or null/absent for static files (render). */
  imageBase?: string | null;
};

export function dimensions(aspectRatio: AspectRatio) {
  return aspectRatio === "9:16" ? { width: 1080, height: 1920 } : { width: 1920, height: 1080 };
}

/** Audio is only used if it was generated from the scene's current narration. */
export function audioForScene(audio: AudioManifest | null, sceneId: string, narration: string) {
  const a = audio?.[sceneId];
  return a && a.text === narration.trim() ? a : null;
}

export interface TimedScene {
  index: number;
  sceneId: string;
  from: number;
  durationInFrames: number;
  audio: SceneAudio | null;
}

/** Scene start/length in frames. A scene grows if its voiceover is longer than planned. */
export function buildTimeline(props: Pick<VideoProps, "storyboard" | "audio">) {
  let from = 0;
  const scenes: TimedScene[] = props.storyboard.scenes.map((s, index) => {
    const audio = audioForScene(props.audio, s.id, s.narration);
    const seconds = Math.max(
      s.duration_seconds,
      audio ? AUDIO_LEAD_SECONDS + audio.durationSec + AUDIO_TAIL_SECONDS : 0,
    );
    const durationInFrames = Math.max(1, Math.round(seconds * FPS));
    const t = { index, sceneId: s.id, from, durationInFrames, audio };
    from += durationInFrames;
    return t;
  });
  return { scenes, durationInFrames: Math.max(1, from) };
}

// ---------------------------------------------------------------------------
// Subtitles
// ---------------------------------------------------------------------------

export interface SubtitleCue {
  text: string;
  /** Seconds from the start of the scene. */
  start: number;
  end: number;
}

const MAX_CUE_CHARS = 42;
const MAX_CUE_WORDS = 8;

/**
 * Word timings when there is no voiceover: spread the words over the scene,
 * longer words taking longer, as a reader would.
 */
export function estimateWordTimings(text: string, sceneSeconds: number, lang: Language): WordTiming[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const natural = words.length / WORDS_PER_SECOND[lang];
  const available = Math.max(1, sceneSeconds - AUDIO_LEAD_SECONDS - 0.5);
  const total = Math.min(natural, available);
  const weights = words.map((w) => 1 + w.length / 6);
  const sum = weights.reduce((a, b) => a + b, 0);
  let t = 0;
  return words.map((w, i) => {
    const d = (weights[i] / sum) * total;
    const timing = { text: w, start: t, end: t + d };
    t += d;
    return timing;
  });
}

/** Group words into short subtitle lines, breaking at sentence ends. */
export function buildCues(words: WordTiming[], offsetSeconds: number): SubtitleCue[] {
  const cues: SubtitleCue[] = [];
  let current: WordTiming[] = [];
  const flush = () => {
    if (!current.length) return;
    cues.push({
      text: current.map((w) => w.text).join(" "),
      start: current[0].start + offsetSeconds,
      end: current[current.length - 1].end + offsetSeconds,
    });
    current = [];
  };
  for (const w of words) {
    const nextLen = current.map((x) => x.text).join(" ").length + w.text.length + 1;
    if (current.length && (nextLen > MAX_CUE_CHARS || current.length >= MAX_CUE_WORDS)) flush();
    current.push(w);
    if (/[.!?؟。]$/.test(w.text)) flush();
    else if (/[,،;:]$/.test(w.text) && current.length >= 4) flush();
  }
  flush();
  // Keep each line up until the next one starts, so the text does not flicker.
  for (let i = 0; i < cues.length - 1; i++) cues[i].end = Math.max(cues[i].end, cues[i + 1].start);
  if (cues.length) cues[cues.length - 1].end += 0.6;
  return cues;
}

/** Plain-text SRT subtitles for the whole video (handy for PowerPoint/players). */
export function buildSrt(props: Pick<VideoProps, "storyboard" | "audio">): string {
  const { scenes } = buildTimeline(props);
  const lines: string[] = [];
  let n = 1;
  const fmt = (s: number) => {
    const ms = Math.max(0, Math.round(s * 1000));
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    const sec = Math.floor((ms % 60_000) / 1000);
    const r = ms % 1000;
    const p = (x: number, l = 2) => String(x).padStart(l, "0");
    return `${p(h)}:${p(m)}:${p(sec)},${p(r, 3)}`;
  };
  for (const t of scenes) {
    const scene = props.storyboard.scenes[t.index];
    const sceneSeconds = t.durationInFrames / FPS;
    const words =
      t.audio?.words ?? estimateWordTimings(scene.narration, sceneSeconds, props.storyboard.language);
    for (const cue of buildCues(words, AUDIO_LEAD_SECONDS)) {
      const base = t.from / FPS;
      lines.push(String(n++), `${fmt(base + cue.start)} --> ${fmt(base + Math.min(cue.end, sceneSeconds))}`, cue.text, "");
    }
  }
  return lines.join("\n");
}

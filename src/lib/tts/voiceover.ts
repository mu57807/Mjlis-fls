// Generate (or reuse) the voiceover for every scene of a storyboard.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import type { Storyboard } from "../schema";
import type { AudioManifest } from "../video";
import { audioDir } from "../storage";
import { getTtsProvider } from "./index";

/**
 * Returns null when no voice service is configured (silent video).
 * Clips are cached by provider + voice + text, so re-rendering after small
 * edits only pays for the scenes that changed.
 */
export async function generateVoiceover(
  projectId: string,
  storyboard: Storyboard,
  previous: AudioManifest | null,
  onScene?: (done: number, total: number) => void,
): Promise<AudioManifest | null> {
  const provider = getTtsProvider();
  if (!provider) return null;
  const lang = storyboard.language;
  const dir = audioDir(projectId);
  fs.mkdirSync(dir, { recursive: true });

  const manifest: AudioManifest = {};
  let done = 0;
  for (const scene of storyboard.scenes) {
    const text = scene.narration.trim();
    const hash = createHash("sha1")
      .update(`${provider.id}|${provider.voice(lang)}|${text}`)
      .digest("hex")
      .slice(0, 12);
    const file = `${scene.id}-${hash}.mp3`;
    const cached = Object.values(previous ?? {}).find((a) => a.file === file);
    if (cached && fs.existsSync(path.join(dir, file))) {
      manifest[scene.id] = cached;
    } else {
      const r = await provider.synthesize(text, lang);
      fs.writeFileSync(path.join(dir, file), r.audio);
      manifest[scene.id] = { file, text, durationSec: r.durationSec, words: r.words };
    }
    onScene?.(++done, storyboard.scenes.length);
  }
  return manifest;
}

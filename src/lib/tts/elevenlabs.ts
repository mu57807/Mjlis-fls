import type { Language } from "../catalog";
import type { WordTiming } from "../video";
import { TtsError, type TtsProvider, type TtsResult } from "./types";

// "George" - a calm multilingual voice that also speaks Arabic with the
// multilingual model. Pick your own voices in the ElevenLabs Voice Library
// and set ELEVENLABS_VOICE_EN / ELEVENLABS_VOICE_AR.
const DEFAULT_VOICE = "JBFqnCBsd6RMkjVDRZzb";

interface Alignment {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
}

/** ElevenLabs gives timings per character; join them into words. */
export function wordsFromAlignment(a: Alignment): WordTiming[] {
  const words: WordTiming[] = [];
  let cur: WordTiming | null = null;
  a.characters.forEach((ch, i) => {
    if (/\s/.test(ch)) {
      if (cur) words.push(cur);
      cur = null;
      return;
    }
    if (!cur) cur = { text: "", start: a.character_start_times_seconds[i], end: 0 };
    cur.text += ch;
    cur.end = a.character_end_times_seconds[i];
  });
  if (cur) words.push(cur);
  return words;
}

export function elevenLabsProvider(apiKey: string): TtsProvider {
  const model = process.env.ELEVENLABS_MODEL || "eleven_multilingual_v2";
  // Override only if your company routes API traffic through a gateway.
  const baseUrl = (process.env.ELEVENLABS_BASE_URL || "https://api.elevenlabs.io").replace(/\/$/, "");
  const voice = (lang: Language) =>
    (lang === "ar" ? process.env.ELEVENLABS_VOICE_AR : process.env.ELEVENLABS_VOICE_EN) || DEFAULT_VOICE;

  return {
    id: `elevenlabs:${model}`,
    voice,
    async synthesize(text: string, lang: Language): Promise<TtsResult> {
      const res = await fetch(
        `${baseUrl}/v1/text-to-speech/${encodeURIComponent(voice(lang))}/with-timestamps?output_format=mp3_44100_128`,
        {
          method: "POST",
          headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
          body: JSON.stringify({
            text,
            model_id: model,
            voice_settings: { stability: 0.5, similarity_boost: 0.75 },
          }),
        },
      );
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        if (res.status === 401) throw new TtsError("ElevenLabs rejected the API key (ELEVENLABS_API_KEY).");
        throw new TtsError(`ElevenLabs error ${res.status}: ${detail.slice(0, 300)}`);
      }
      const data = (await res.json()) as { audio_base64: string; alignment: Alignment | null };
      const words = data.alignment ? wordsFromAlignment(data.alignment) : [];
      const durationSec = words.length ? words[words.length - 1].end : 0;
      return { audio: Buffer.from(data.audio_base64, "base64"), extension: "mp3", durationSec, words };
    },
  };
}

import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import type { Language } from "../catalog";
import type { WordTiming } from "../video";
import { TtsError, type TtsProvider, type TtsResult } from "./types";

const TICKS_PER_SECOND = 10_000_000;

// Neural voices. Arabic (Saudi Arabia) voices speak Modern Standard Arabic.
// Full list: https://learn.microsoft.com/azure/ai-services/speech-service/language-support
const DEFAULT_VOICES: Record<Language, string> = {
  en: "en-GB-RyanNeural",
  ar: "ar-SA-HamedNeural",
};

export function azureProvider(key: string, region: string): TtsProvider {
  const voice = (lang: Language) =>
    (lang === "ar" ? process.env.AZURE_VOICE_AR : process.env.AZURE_VOICE_EN) || DEFAULT_VOICES[lang];

  return {
    id: "azure",
    voice,
    synthesize(text: string, lang: Language): Promise<TtsResult> {
      const config = sdk.SpeechConfig.fromSubscription(key, region);
      config.speechSynthesisVoiceName = voice(lang);
      config.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Audio24Khz96KBitRateMonoMp3;
      // No audio output device: keep the audio in memory.
      const synth = new sdk.SpeechSynthesizer(config, null as unknown as sdk.AudioConfig);
      const words: WordTiming[] = [];
      synth.wordBoundary = (_s, e) => {
        if (e.boundaryType !== sdk.SpeechSynthesisBoundaryType.Word) return;
        const start = e.audioOffset / TICKS_PER_SECOND;
        words.push({ text: e.text, start, end: start + e.duration / TICKS_PER_SECOND });
      };
      return new Promise((resolve, reject) => {
        synth.speakTextAsync(
          text,
          (result) => {
            synth.close();
            if (result.reason !== sdk.ResultReason.SynthesizingAudioCompleted) {
              reject(new TtsError(`Azure TTS failed: ${result.errorDetails || "unknown error"}`));
              return;
            }
            resolve({
              audio: Buffer.from(result.audioData),
              extension: "mp3",
              durationSec: result.audioDuration / TICKS_PER_SECOND,
              words: alignToText(words, text),
            });
          },
          (err) => {
            synth.close();
            reject(new TtsError(`Azure TTS failed: ${err}`));
          },
        );
      });
    },
  };
}

/**
 * Azure reports words without their punctuation. Map the timings back onto
 * the narration's own words so subtitles show the punctuation too.
 */
function alignToText(timings: WordTiming[], text: string): WordTiming[] {
  const tokens = text.trim().split(/\s+/);
  if (timings.length === 0) return [];
  return tokens.map((tok, i) => {
    const t = timings[Math.min(i, timings.length - 1)];
    return { text: tok, start: t.start, end: t.end };
  });
}

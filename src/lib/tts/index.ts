import { envKey } from "../env";
import { azureProvider } from "./azure";
import { elevenLabsProvider } from "./elevenlabs";
import { TtsError, type TtsProvider } from "./types";

export { TtsError };
export type { TtsProvider };

/**
 * Which voice service to use, from TTS_PROVIDER in .env.local:
 *   elevenlabs | azure | none   (none = silent video with subtitles only)
 * If TTS_PROVIDER is not set, the first service with a key is used.
 */
export function getTtsProvider(): TtsProvider | null {
  const choice =
    process.env.TTS_PROVIDER ||
    (envKey("ELEVENLABS_API_KEY") ? "elevenlabs" : envKey("AZURE_SPEECH_KEY") ? "azure" : "none");

  switch (choice) {
    case "none":
      return null;
    case "elevenlabs": {
      const key = envKey("ELEVENLABS_API_KEY");
      if (!key) throw new TtsError("TTS_PROVIDER is elevenlabs but ELEVENLABS_API_KEY is empty.");
      return elevenLabsProvider(key);
    }
    case "azure": {
      const key = envKey("AZURE_SPEECH_KEY");
      const region = process.env.AZURE_SPEECH_REGION;
      if (!key || !region) {
        throw new TtsError("TTS_PROVIDER is azure but AZURE_SPEECH_KEY or AZURE_SPEECH_REGION is empty.");
      }
      return azureProvider(key, region);
    }
    default:
      throw new TtsError(`Unknown TTS_PROVIDER "${choice}". Use elevenlabs, azure or none.`);
  }
}

export function ttsProviderName(): string {
  try {
    return getTtsProvider()?.id.split(":")[0] ?? "none";
  } catch {
    return "misconfigured";
  }
}

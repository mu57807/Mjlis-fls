import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { randomUUID } from "node:crypto";
import { ICONS, type Language } from "../catalog";
import { ClaudeStoryboardSchema, type ClaudeStoryboard, type Storyboard } from "../schema";
import { fitDurations, totalDuration } from "../storyboard-checks";
import { DEMO_STORYBOARDS } from "@/samples/demo-storyboards";
import { matchSample } from "@/samples/incidents";
import { SYSTEM_PROMPT, buildUserMessage } from "./prompt";

/** An error whose message is safe and helpful to show to the user. */
export class StructuringError extends Error {}

const EFFORTS = ["low", "medium", "high"] as const;
type Effort = (typeof EFFORTS)[number];

export function isDemoMode(): boolean {
  return process.env.LFI_DEMO_MODE === "true";
}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new StructuringError(
      "No Claude API key is set. Add ANTHROPIC_API_KEY to the .env.local file and restart the app, or set LFI_DEMO_MODE=true to try the built-in samples.",
    );
  }
  client ??= new Anthropic();
  return client;
}

async function callClaude(
  description: string,
  language: Language,
  targetSeconds: number,
): Promise<ClaudeStoryboard> {
  const effortEnv = process.env.CLAUDE_EFFORT as Effort | undefined;
  const effort: Effort = effortEnv && EFFORTS.includes(effortEnv) ? effortEnv : "high";

  let response;
  try {
    response = await getClient().beta.messages.parse({
      model: process.env.CLAUDE_MODEL || "claude-opus-5-5",
      max_tokens: 16000,
      // If a safety classifier wrongly declines (rare for safety reports),
      // the API retries the same request on a fallback model automatically.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      thinking: { type: "adaptive" },
      output_config: {
        effort,
        format: betaZodOutputFormat(ClaudeStoryboardSchema),
      },
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      messages: [
        {
          role: "user",
          content: buildUserMessage({ description, language, targetSeconds }),
        },
      ],
    });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      throw new StructuringError("Claude rejected the API key. Check ANTHROPIC_API_KEY in .env.local.");
    }
    if (err instanceof Anthropic.RateLimitError) {
      throw new StructuringError("Claude is receiving too many requests right now. Wait a minute and try again.");
    }
    if (err instanceof Anthropic.APIConnectionError) {
      throw new StructuringError("Could not reach the Claude API. Check the internet / proxy connection.");
    }
    if (err instanceof Anthropic.APIError) {
      throw new StructuringError(`Claude API error (${err.status ?? "unknown"}): ${err.message}`);
    }
    throw err;
  }

  if (response.stop_reason === "refusal") {
    throw new StructuringError(
      "Claude declined to process this description. Try rephrasing it, or contact the administrator.",
    );
  }
  if (response.stop_reason === "max_tokens") {
    throw new StructuringError("The storyboard came back incomplete. Try a shorter description.");
  }
  if (!response.parsed_output) {
    throw new StructuringError("Claude's reply did not match the storyboard format. Please try again.");
  }
  return response.parsed_output;
}

/** Turn Claude's raw reply into a storyboard the app can store and edit. */
export function finaliseStoryboard(
  raw: ClaudeStoryboard,
  language: Language,
  targetSeconds: number,
): Storyboard {
  let scenes = raw.scenes.map((s) => ({
    ...s,
    id: randomUUID(),
    narration: s.narration.trim(),
    caption: s.caption.trim(),
    icons: [...new Set(s.icons)].filter((i) => ICONS.includes(i)).slice(0, 4),
    duration_seconds: Number.isFinite(s.duration_seconds) && s.duration_seconds > 0 ? s.duration_seconds : 8,
  }));
  if (Math.abs(totalDuration(scenes) - targetSeconds) > 1) {
    scenes = fitDurations(scenes, targetSeconds);
  }
  return { ...raw, language, scenes };
}

/** Description -> storyboard for one output language. */
export async function structureIncident(opts: {
  description: string;
  language: Language;
  targetSeconds: number;
}): Promise<{ storyboard: Storyboard; demo: boolean }> {
  if (isDemoMode()) {
    const sample = matchSample(opts.description);
    if (!sample) {
      throw new StructuringError(
        "Demo mode is on, so only the built-in sample incidents can be used. Click one of the 'Load sample' buttons, or add a Claude API key and set LFI_DEMO_MODE=false.",
      );
    }
    const raw = structuredClone(DEMO_STORYBOARDS[sample.id][opts.language]);
    return { storyboard: finaliseStoryboard(raw, opts.language, opts.targetSeconds), demo: true };
  }
  const raw = await callClaude(opts.description, opts.language, opts.targetSeconds);
  return { storyboard: finaliseStoryboard(raw, opts.language, opts.targetSeconds), demo: false };
}

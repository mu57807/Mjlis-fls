import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";

/** An error whose message is safe and helpful to show to the user. */
export class StructuringError extends Error {}

const EFFORTS = ["low", "medium", "high"] as const;
type Effort = (typeof EFFORTS)[number];

export function isDemoMode(): boolean {
  return process.env.LFI_DEMO_MODE === "true";
}

export function claudeAvailable(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY) && !isDemoMode();
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

export type ClaudeContent = string | Anthropic.Beta.Messages.BetaContentBlockParam[];

/**
 * One Claude request whose answer must match `schema` (structured output).
 * Throws StructuringError with a user-safe message on any problem.
 */
export async function askClaude<S extends z.ZodType>(opts: {
  schema: S;
  system: string;
  content: ClaudeContent;
  effort?: Effort;
  what: string;
}): Promise<z.infer<S>> {
  const effortEnv = process.env.CLAUDE_EFFORT as Effort | undefined;
  const effort: Effort = opts.effort ?? (effortEnv && EFFORTS.includes(effortEnv) ? effortEnv : "high");

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
      output_config: { effort, format: betaZodOutputFormat(opts.schema) },
      system: [{ type: "text", text: opts.system, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: opts.content }],
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
    throw new StructuringError(`Claude declined to process this ${opts.what}. Contact the administrator.`);
  }
  if (response.stop_reason === "max_tokens") {
    throw new StructuringError(`The ${opts.what} came back incomplete. Try a shorter input.`);
  }
  if (!response.parsed_output) {
    throw new StructuringError(`Claude's reply did not match the expected ${opts.what} format. Please try again.`);
  }
  return response.parsed_output as z.infer<S>;
}

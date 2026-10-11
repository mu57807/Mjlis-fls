import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";
import { envKey } from "../env";

/** An error whose message is safe and helpful to show to the user. */
export class StructuringError extends Error {}

const EFFORTS = ["low", "medium", "high"] as const;
type Effort = (typeof EFFORTS)[number];

export function isDemoMode(): boolean {
  return process.env.LFI_DEMO_MODE === "true";
}

export function claudeAvailable(): boolean {
  return Boolean(envKey("ANTHROPIC_API_KEY")) && !isDemoMode();
}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  const apiKey = envKey("ANTHROPIC_API_KEY");
  if (!apiKey) {
    throw new StructuringError(
      "No Claude API key is set. Add ANTHROPIC_API_KEY (in .env.local on your computer, or in Variables on your hosting service) and restart the app, or set LFI_DEMO_MODE=true to try the built-in samples.",
    );
  }
  client ??= new Anthropic({ apiKey });
  return client;
}

/** Explain a rejected key without revealing it. */
function keyProblem(): string {
  const key = envKey("ANTHROPIC_API_KEY") ?? "";
  const where =
    "Check ANTHROPIC_API_KEY (in .env.local on your computer, or in Variables on your hosting service, then redeploy).";
  if (!key.startsWith("sk-ant-")) {
    return `Claude rejected the API key: it does not look like a Claude API key (those start with "sk-ant-"). ${where}`;
  }
  return `Claude rejected the API key (it is ${key.length} characters long and ends in "${key.slice(-4)}"). It may be mistyped, cut short, or deleted in the Claude Console. ${where}`;
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
      throw new StructuringError(keyProblem());
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

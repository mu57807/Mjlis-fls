import "server-only";
import { randomUUID } from "node:crypto";
import type { AspectRatio, Language } from "./catalog";
import type { Project } from "./schema";
import { approveProject, claimRender, createProject, getProject } from "./db";
import { structureIncident } from "./claude/structure";
import { startRenderWorker } from "./render/start";

/** Arabic if most letters in the text are Arabic, otherwise English. */
export function detectLanguage(text: string): Language {
  const arabic = (text.match(/[؀-ۿ]/g) ?? []).length;
  const latin = (text.match(/[A-Za-z]/g) ?? []).length;
  return arabic > latin ? "ar" : "en";
}

/**
 * Incident text -> one draft project per output language. Shared by the web
 * form, the API and WhatsApp. Throws StructuringError with a user-safe message.
 */
export async function createFromIncident(input: {
  description: string;
  outputLanguage: Language | "both" | "auto";
  aspectRatio: AspectRatio;
  targetSeconds: 60 | 90;
  origin?: Project["origin"];
  originContact?: string | null;
  callbackUrl?: string | null;
}): Promise<Project[]> {
  const languages: Language[] =
    input.outputLanguage === "both"
      ? ["en", "ar"]
      : input.outputLanguage === "auto"
        ? [detectLanguage(input.description)]
        : [input.outputLanguage];
  const results = await Promise.all(
    languages.map((language) =>
      structureIncident({ description: input.description, language, targetSeconds: input.targetSeconds }),
    ),
  );
  const batchId = randomUUID();
  return results.map(({ storyboard, demo }) =>
    createProject({
      batchId,
      aspectRatio: input.aspectRatio,
      targetSeconds: input.targetSeconds,
      sourceText: input.description,
      storyboard,
      demo,
      origin: input.origin,
      originContact: input.originContact,
      callbackUrl: input.callbackUrl,
    }),
  );
}

/** Approve the saved storyboard (if still a draft) and start rendering it. */
export function approveAndRender(id: string): { project: Project | null; error?: string } {
  const existing = getProject(id);
  if (!existing) return { project: null, error: "Not found" };
  if (existing.status === "rendering") return { project: existing };
  if (existing.status === "draft") approveProject(id);
  if (!claimRender(id)) {
    return { project: getProject(id), error: `Cannot render a project that is ${existing.status}.` };
  }
  startRenderWorker(id);
  return { project: getProject(id) };
}

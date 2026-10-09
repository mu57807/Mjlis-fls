import { randomUUID } from "node:crypto";
import { CreateRequestSchema } from "@/lib/schema";
import { createProject } from "@/lib/db";
import { StructuringError, structureIncident } from "@/lib/claude/structure";
import type { Language } from "@/lib/catalog";

// POST /api/storyboard
// Body: { description, outputLanguage: "en"|"ar"|"both", aspectRatio, targetSeconds }
// Creates one project per output language ("both" = two separate videos).
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = CreateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues.map((i) => i.message).join(" ") },
      { status: 400 },
    );
  }
  const { description, outputLanguage, aspectRatio, targetSeconds } = parsed.data;
  const languages: Language[] = outputLanguage === "both" ? ["en", "ar"] : [outputLanguage];

  try {
    const results = await Promise.all(
      languages.map((language) => structureIncident({ description, language, targetSeconds })),
    );
    const batchId = randomUUID();
    const projects = results.map(({ storyboard, demo }) =>
      createProject({ batchId, aspectRatio, targetSeconds, sourceText: description, storyboard, demo }),
    );
    return Response.json({ projectIds: projects.map((p) => p.id) });
  } catch (err) {
    if (err instanceof StructuringError) {
      return Response.json({ error: err.message }, { status: 502 });
    }
    console.error("Storyboard generation failed", err);
    return Response.json(
      { error: "Something went wrong while creating the storyboard. Check the server log." },
      { status: 500 },
    );
  }
}

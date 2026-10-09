import { z } from "zod";
import { ASPECT_RATIOS } from "@/lib/catalog";
import { checkApiKey } from "@/lib/api-auth";
import { projectForApi } from "@/lib/api-view";
import { StructuringError } from "@/lib/claude/structure";
import { createFromIncident } from "@/lib/pipeline";

const CreateSchema = z.object({
  description: z.string().trim().min(40).max(20000),
  outputLanguage: z.enum(["en", "ar", "both", "auto"]).default("auto"),
  aspectRatio: z.enum(ASPECT_RATIOS).default("9:16"),
  targetSeconds: z.union([z.literal(60), z.literal(90)]).default(60),
  /** Optional: we POST here when the video is ready or failed. */
  callbackUrl: z.url({ protocol: /^https?$/ }).optional(),
});

/**
 * POST /api/v1/lfi  - submit an incident; returns draft storyboard(s).
 * Nothing renders until someone approves: POST /api/v1/lfi/:id/approve.
 */
export async function POST(request: Request) {
  const denied = checkApiKey(request);
  if (denied) return denied;
  const parsed = CreateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") },
      { status: 400 },
    );
  }
  try {
    const projects = await createFromIncident({ ...parsed.data, origin: "api" });
    return Response.json({ projects: projects.map(projectForApi) }, { status: 201 });
  } catch (err) {
    if (err instanceof StructuringError) return Response.json({ error: err.message }, { status: 502 });
    console.error("API storyboard failed", err);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}

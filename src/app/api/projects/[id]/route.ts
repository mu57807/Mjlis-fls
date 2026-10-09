import { z } from "zod";
import { ASPECT_RATIOS } from "@/lib/catalog";
import { StoryboardSchema } from "@/lib/schema";
import { deleteProject, getProject, saveStoryboard, siblingProjects } from "@/lib/db";

// GET /api/projects/:id - project with its storyboard.
export async function GET(_req: Request, ctx: RouteContext<"/api/projects/[id]">) {
  const { id } = await ctx.params;
  const project = getProject(id);
  if (!project) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ project, siblings: siblingProjects(project.batchId, id) });
}

const SaveSchema = z.object({
  storyboard: StoryboardSchema,
  aspectRatio: z.enum(ASPECT_RATIOS),
  targetSeconds: z.union([z.literal(60), z.literal(90)]),
});

// PUT /api/projects/:id - save edits. Any edit sends the project back to draft.
export async function PUT(request: Request, ctx: RouteContext<"/api/projects/[id]">) {
  const { id } = await ctx.params;
  const existing = getProject(id);
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });
  if (existing.status === "rendering") {
    return Response.json({ error: "This video is rendering; wait until it finishes." }, { status: 409 });
  }
  const parsed = SaveSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `${describePath(i.path)}: ${i.message}`).join("; ");
    return Response.json({ error: `Cannot save: ${msg}` }, { status: 400 });
  }
  const { storyboard, aspectRatio, targetSeconds } = parsed.data;
  // The language of a project never changes; keep the stored one.
  const project = saveStoryboard(
    id,
    { ...storyboard, language: existing.language },
    { aspectRatio, targetSeconds },
  );
  return Response.json({ project });
}

// DELETE /api/projects/:id
export async function DELETE(_req: Request, ctx: RouteContext<"/api/projects/[id]">) {
  const { id } = await ctx.params;
  if (!deleteProject(id)) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ ok: true });
}

/** ["storyboard","scenes",1,"narration"] -> "Scene 2 narration" */
function describePath(path: PropertyKey[]): string {
  const p = path[0] === "storyboard" ? path.slice(1) : path;
  if (p[0] === "scenes" && typeof p[1] === "number") {
    return [`Scene ${p[1] + 1}`, ...p.slice(2).map(String)].join(" ").replace(/_/g, " ");
  }
  return p.map(String).join(" ").replace(/_/g, " ") || "storyboard";
}

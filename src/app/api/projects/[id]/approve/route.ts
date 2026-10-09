import { getProject, approveProject } from "@/lib/db";

// POST /api/projects/:id/approve - the reviewer signs off the saved storyboard.
// Nothing can be rendered until a project is approved.
export async function POST(_req: Request, ctx: RouteContext<"/api/projects/[id]/approve">) {
  const { id } = await ctx.params;
  const existing = getProject(id);
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });
  if (existing.status !== "draft" && existing.status !== "approved") {
    return Response.json({ error: `Cannot approve a project that is ${existing.status}.` }, { status: 409 });
  }
  return Response.json({ project: approveProject(id) });
}

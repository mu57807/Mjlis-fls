import { getProject } from "@/lib/db";
import { renderIfCompliant } from "@/lib/pipeline";

// POST /api/projects/:id/render - run the final check, then start rendering.
// If the check finds a company name, an ID or an unchecked picture, the render
// is blocked and the problems are returned (and shown on the review screen).
// Progress is read back with GET /api/projects/:id (project.render).
export async function POST(_req: Request, ctx: RouteContext<"/api/projects/[id]/render">) {
  const { id } = await ctx.params;
  if (!getProject(id)) return Response.json({ error: "Not found" }, { status: 404 });
  const { project, error, check } = await renderIfCompliant(id);
  if (error) return Response.json({ error, project, check }, { status: 409 });
  return Response.json({ project, check });
}

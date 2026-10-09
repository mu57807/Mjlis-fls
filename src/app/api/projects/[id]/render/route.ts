import { claimRender, getProject } from "@/lib/db";
import { startRenderWorker } from "@/lib/render/start";

// POST /api/projects/:id/render - start rendering an approved storyboard.
// Progress is read back with GET /api/projects/:id (project.render).
export async function POST(_req: Request, ctx: RouteContext<"/api/projects/[id]/render">) {
  const { id } = await ctx.params;
  const project = getProject(id);
  if (!project) return Response.json({ error: "Not found" }, { status: 404 });
  if (project.status === "rendering") return Response.json({ project });
  if (!project.approvedAt) {
    return Response.json({ error: "Approve the storyboard before rendering." }, { status: 409 });
  }
  if (!claimRender(id)) {
    return Response.json({ error: `Cannot render a project that is ${project.status}.` }, { status: 409 });
  }
  startRenderWorker(id);
  return Response.json({ project: getProject(id) });
}

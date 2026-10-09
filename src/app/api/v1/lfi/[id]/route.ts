import { checkApiKey } from "@/lib/api-auth";
import { projectForApi } from "@/lib/api-view";
import { getProject } from "@/lib/db";

// GET /api/v1/lfi/:id - status, storyboard summary, and video links when done.
export async function GET(request: Request, ctx: RouteContext<"/api/v1/lfi/[id]">) {
  const denied = checkApiKey(request);
  if (denied) return denied;
  const { id } = await ctx.params;
  const project = /^[0-9a-f-]{36}$/i.test(id) ? getProject(id) : null;
  if (!project || project.origin !== "api") return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ project: projectForApi(project) });
}

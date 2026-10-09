import { checkApiKey } from "@/lib/api-auth";
import { projectForApi } from "@/lib/api-view";
import { getProject } from "@/lib/db";
import { approveAndRender } from "@/lib/pipeline";

/**
 * POST /api/v1/lfi/:id/approve - a person has reviewed the storyboard;
 * approve it and start rendering. Poll GET /api/v1/lfi/:id or wait for the callback.
 */
export async function POST(request: Request, ctx: RouteContext<"/api/v1/lfi/[id]/approve">) {
  const denied = checkApiKey(request);
  if (denied) return denied;
  const { id } = await ctx.params;
  const existing = /^[0-9a-f-]{36}$/i.test(id) ? getProject(id) : null;
  if (!existing || existing.origin !== "api") return Response.json({ error: "Not found" }, { status: 404 });
  const { project, error } = approveAndRender(id);
  if (error) return Response.json({ error, project: project && projectForApi(project) }, { status: 409 });
  return Response.json({ project: projectForApi(project!) }, { status: 202 });
}

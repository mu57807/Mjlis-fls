import { getProject } from "@/lib/db";
import { readShareToken } from "@/lib/share";
import { serveProjectFile } from "@/lib/serve-file";

// GET /api/share/<signed token>/<any name> - a finished video or thumbnail,
// for people without a login (WhatsApp, API callers). Links expire.
export async function GET(request: Request, ctx: RouteContext<"/api/share/[token]/[name]">) {
  const { token } = await ctx.params;
  const share = readShareToken(token);
  if (!share) return new Response("This link has expired or is not valid.", { status: 404 });
  const project = getProject(share.projectId);
  if (!project || project.status !== "done") return new Response("This video is not available.", { status: 404 });
  return serveProjectFile(request, project, share.file, {
    download: new URL(request.url).searchParams.has("download"),
  });
}

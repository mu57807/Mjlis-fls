import { getProject } from "@/lib/db";
import { serveProjectFile } from "@/lib/serve-file";

// GET /api/projects/:id/files/<file> - video, thumbnail, subtitles and audio clips.
// Add ?download=1 to save the file instead of playing it.
export async function GET(request: Request, ctx: RouteContext<"/api/projects/[id]/files/[...path]">) {
  const { id, path: parts } = await ctx.params;
  const project = getProject(id);
  if (!project) return new Response("Not found", { status: 404 });
  return serveProjectFile(request, project, parts.join("/"), {
    download: new URL(request.url).searchParams.has("download"),
  });
}

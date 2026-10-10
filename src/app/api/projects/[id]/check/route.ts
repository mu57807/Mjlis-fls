import { z } from "zod";
import { StoryboardSchema } from "@/lib/schema";
import { getBannedHashes, getProject } from "@/lib/db";
import { checkStoryboardCompliance, withoutAcknowledged } from "@/lib/compliance";

const Body = z.object({ storyboard: StoryboardSchema });

// POST /api/projects/:id/check - the automatic part of the final check on
// unsaved edits, so problems are highlighted while you type.
export async function POST(request: Request, ctx: RouteContext<"/api/projects/[id]/check">) {
  const { id } = await ctx.params;
  const project = getProject(id);
  if (!project) return Response.json({ error: "Not found" }, { status: 404 });
  const parsed = Body.safeParse(await request.json().catch(() => null));
  // While typing the storyboard may be briefly invalid (e.g. an empty narration); check what is saved then.
  const sb = parsed.success ? parsed.data.storyboard : project.storyboard;
  const issues = withoutAcknowledged(checkStoryboardCompliance(sb, getBannedHashes(id)), project.compliance.acknowledged);
  return Response.json({ issues });
}

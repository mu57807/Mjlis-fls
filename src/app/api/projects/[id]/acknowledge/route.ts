import { z } from "zod";
import { acknowledgeIssues, getProject } from "@/lib/db";

const Body = z.object({ keys: z.array(z.string().max(300)).min(1).max(50) });

// POST /api/projects/:id/acknowledge - the reviewer confirms these findings are
// false alarms (not a company name or ID), or that a flagged picture is safe.
// Names/IDs known to come from the source can't be dismissed: they must be edited out.
export async function POST(request: Request, ctx: RouteContext<"/api/projects/[id]/acknowledge">) {
  const { id } = await ctx.params;
  if (!getProject(id)) return Response.json({ error: "Not found" }, { status: 404 });
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid data" }, { status: 400 });
  const keys = parsed.data.keys.filter((k) => !k.startsWith("known:"));
  return Response.json({ project: acknowledgeIssues(id, keys) });
}

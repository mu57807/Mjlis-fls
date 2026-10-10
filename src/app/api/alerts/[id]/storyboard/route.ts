import { z } from "zod";
import { ASPECT_RATIOS } from "@/lib/catalog";
import { getAlert } from "@/lib/db";
import { StructuringError } from "@/lib/claude/client";
import { ComplianceBlockedError, createFromAlert } from "@/lib/pipeline";

const Body = z.object({
  outputLanguage: z.enum(["en", "ar", "both", "auto"]),
  aspectRatio: z.enum(ASPECT_RATIOS),
  targetSeconds: z.union([z.literal(60), z.literal(90)]),
});

// POST /api/alerts/:id/storyboard - turn the reviewed alert into storyboard(s).
// Refused while any field breaks the APP RULES or a used picture is unchecked.
export async function POST(request: Request, ctx: RouteContext<"/api/alerts/[id]/storyboard">) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id) || !getAlert(id)) return Response.json({ error: "Not found" }, { status: 404 });
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid options" }, { status: 400 });
  try {
    const projects = await createFromAlert(id, parsed.data);
    return Response.json({ projectIds: projects.map((p) => p.id) }, { status: 201 });
  } catch (err) {
    if (err instanceof ComplianceBlockedError) return Response.json({ error: err.message, issues: err.issues }, { status: 409 });
    if (err instanceof StructuringError) return Response.json({ error: err.message }, { status: 502 });
    console.error("Storyboard from alert failed", err);
    return Response.json({ error: "Something went wrong. Check the server log." }, { status: 500 });
  }
}

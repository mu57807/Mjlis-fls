import { z } from "zod";
import { getAlert, getAlertBannedHashes } from "@/lib/db";
import { checkAlert } from "@/lib/alerts/check";
import { AlertFieldsSchema } from "@/lib/alerts/types";

const Body = z.object({
  fields: AlertFieldsSchema,
  pictures: z.array(z.object({ id: z.string(), use: z.boolean(), checked: z.boolean() })),
});

// POST /api/alerts/:id/check - rule check of unsaved edits (for live highlighting).
export async function POST(request: Request, ctx: RouteContext<"/api/alerts/[id]/check">) {
  const { id } = await ctx.params;
  const alert = /^[0-9a-f-]{36}$/i.test(id) ? getAlert(id) : null;
  if (!alert) return Response.json({ error: "Not found" }, { status: 404 });
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid data" }, { status: 400 });
  const state = new Map(parsed.data.pictures.map((p) => [p.id, p]));
  const pictures = alert.pictures
    .filter((p) => state.has(p.id))
    .map((p) => ({ ...p, use: state.get(p.id)!.use, checked: state.get(p.id)!.checked }));
  return Response.json({ issues: checkAlert(parsed.data.fields, pictures, getAlertBannedHashes(id)) });
}

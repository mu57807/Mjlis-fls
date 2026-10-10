import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { deleteAlert, getAlert, getAlertBannedHashes, updateAlert } from "@/lib/db";
import { checkAlert } from "@/lib/alerts/check";
import { AlertFieldsSchema, PICTURE_KINDS, type AlertPicture } from "@/lib/alerts/types";
import { alertDir } from "@/lib/storage";

const isId = (id: string) => /^[0-9a-f-]{36}$/i.test(id);

// GET /api/alerts/:id - fields, pictures and the current rule check.
export async function GET(_req: Request, ctx: RouteContext<"/api/alerts/[id]">) {
  const { id } = await ctx.params;
  const alert = isId(id) ? getAlert(id) : null;
  if (!alert) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ alert, issues: checkAlert(alert.fields, alert.pictures, getAlertBannedHashes(id)) });
}

const PictureEditSchema = z.object({
  id: z.string(),
  use: z.boolean(),
  checked: z.boolean(),
  description: z.string().max(500),
  kind: z.enum(PICTURE_KINDS),
});

const SaveSchema = z.object({
  fields: AlertFieldsSchema,
  /** Pictures in the new order. Pictures left out are deleted. */
  pictures: z.array(PictureEditSchema),
});

// PUT /api/alerts/:id - save the reviewer's edits.
export async function PUT(request: Request, ctx: RouteContext<"/api/alerts/[id]">) {
  const { id } = await ctx.params;
  const alert = isId(id) ? getAlert(id) : null;
  if (!alert) return Response.json({ error: "Not found" }, { status: 404 });
  const parsed = SaveSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid data" }, { status: 400 });

  // Only known pictures; file names and flags stay under the server's control.
  const byId = new Map(alert.pictures.map((p) => [p.id, p]));
  const pictures: AlertPicture[] = [];
  for (const edit of parsed.data.pictures) {
    const p = byId.get(edit.id);
    if (!p) continue;
    pictures.push({ ...p, use: edit.use, checked: edit.checked, description: edit.description, kind: edit.kind });
    byId.delete(edit.id);
  }
  // Removed pictures are deleted from disk.
  for (const removed of byId.values()) {
    for (const f of [removed.file, removed.original_file]) {
      if (f) fs.rmSync(path.join(alertDir(id), "images", f), { force: true });
    }
  }
  const updated = updateAlert(id, { fields: parsed.data.fields, pictures })!;
  return Response.json({ alert: updated, issues: checkAlert(updated.fields, updated.pictures, getAlertBannedHashes(id)) });
}

// DELETE /api/alerts/:id - remove the alert and its pictures.
export async function DELETE(_req: Request, ctx: RouteContext<"/api/alerts/[id]">) {
  const { id } = await ctx.params;
  if (!isId(id) || !deleteAlert(id)) return Response.json({ error: "Not found" }, { status: 404 });
  fs.rmSync(alertDir(id), { recursive: true, force: true });
  return Response.json({ ok: true });
}

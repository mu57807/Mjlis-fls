import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { getAlert, updateAlert } from "@/lib/db";
import { alertDir } from "@/lib/storage";

async function load(ctx: RouteContext<"/api/alerts/[id]/pictures/[picId]">) {
  const { id, picId } = await ctx.params;
  const alert = /^[0-9a-f-]{36}$/i.test(id) ? getAlert(id) : null;
  const pic = alert?.pictures.find((p) => p.id === picId);
  return { id, alert, pic };
}

/**
 * PUT /api/alerts/:id/pictures/:picId - body: the blurred picture (JPEG/PNG)
 * made with the blur tool. It replaces the picture; the original is kept
 * until "Undo blur", and is never used in a video.
 */
export async function PUT(request: Request, ctx: RouteContext<"/api/alerts/[id]/pictures/[picId]">) {
  const { id, alert, pic } = await load(ctx);
  if (!alert || !pic) return Response.json({ error: "Not found" }, { status: 404 });
  const body = Buffer.from(await request.arrayBuffer());
  if (body.length === 0 || body.length > 15 * 1024 * 1024) return Response.json({ error: "Invalid picture" }, { status: 400 });
  let jpeg: Buffer;
  try {
    jpeg = await sharp(body).flatten({ background: "#ffffff" }).jpeg({ quality: 90 }).toBuffer();
  } catch {
    return Response.json({ error: "Invalid picture" }, { status: 400 });
  }
  const dir = path.join(alertDir(id), "images");
  const file = `${pic.id}-b${Date.now()}.jpg`;
  fs.writeFileSync(path.join(dir, file), jpeg);
  // Keep the very first original; drop earlier blurred versions.
  if (pic.original_file && pic.file !== pic.original_file) fs.rmSync(path.join(dir, pic.file), { force: true });
  const updated = { ...pic, file, original_file: pic.original_file ?? pic.file, blurred: true, checked: true };
  const saved = updateAlert(id, { pictures: alert.pictures.map((p) => (p.id === pic.id ? updated : p)) });
  return Response.json({ alert: saved });
}

// DELETE /api/alerts/:id/pictures/:picId - undo the blur (back to the extracted picture).
export async function DELETE(_req: Request, ctx: RouteContext<"/api/alerts/[id]/pictures/[picId]">) {
  const { id, alert, pic } = await load(ctx);
  if (!alert || !pic) return Response.json({ error: "Not found" }, { status: 404 });
  if (!pic.original_file) return Response.json({ alert });
  fs.rmSync(path.join(alertDir(id), "images", pic.file), { force: true });
  const updated = { ...pic, file: pic.original_file, original_file: null, blurred: false, checked: false };
  const saved = updateAlert(id, { pictures: alert.pictures.map((p) => (p.id === pic.id ? updated : p)) });
  return Response.json({ alert: saved });
}

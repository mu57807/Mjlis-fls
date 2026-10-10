import fs from "node:fs";
import path from "node:path";
import { getAlert } from "@/lib/db";
import { alertDir } from "@/lib/storage";

// GET /api/alerts/:id/files/<picture file> - for the review screen.
export async function GET(_req: Request, ctx: RouteContext<"/api/alerts/[id]/files/[file]">) {
  const { id, file } = await ctx.params;
  const alert = /^[0-9a-f-]{36}$/i.test(id) ? getAlert(id) : null;
  const known = alert?.pictures.some((p) => p.file === file || p.original_file === file);
  if (!known || !/^[\w-]+\.jpg$/.test(file)) return new Response("Not found", { status: 404 });
  const full = path.join(alertDir(id), "images", file);
  if (!fs.existsSync(full)) return new Response("Not found", { status: 404 });
  return new Response(fs.readFileSync(full), { headers: { "Content-Type": "image/jpeg", "Cache-Control": "no-cache" } });
}

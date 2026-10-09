import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { getProject } from "@/lib/db";
import { projectDir } from "@/lib/storage";

const TYPES: Record<string, string> = {
  ".mp4": "video/mp4",
  ".mp3": "audio/mpeg",
  ".jpg": "image/jpeg",
  ".srt": "application/x-subrip; charset=utf-8",
};

// GET /api/projects/:id/files/<file> - video, thumbnail, subtitles and audio clips.
// Add ?download=1 to save the file instead of playing it.
export async function GET(request: Request, ctx: RouteContext<"/api/projects/[id]/files/[...path]">) {
  const { id, path: parts } = await ctx.params;
  const project = getProject(id);
  if (!project) return new Response("Not found", { status: 404 });

  const rel = parts.join("/");
  if (!/^(video\.mp4|thumbnail\.jpg|subtitles\.srt|audio\/[\w-]+\.mp3)$/.test(rel)) {
    return new Response("Not found", { status: 404 });
  }
  const file = path.join(projectDir(id), rel);
  if (!fs.existsSync(file)) return new Response("Not found", { status: 404 });

  const size = fs.statSync(file).size;
  const headers = new Headers({
    "Content-Type": TYPES[path.extname(file)] ?? "application/octet-stream",
    "Accept-Ranges": "bytes",
    "Cache-Control": "no-cache",
  });
  if (new URL(request.url).searchParams.has("download")) {
    const slug =
      project.storyboard.title
        .normalize("NFC")
        .replace(/[^\p{L}\p{M}\p{N}]+/gu, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60) || "lfi-video";
    const name = `${slug}-${project.language}-${project.aspectRatio.replace(":", "x")}${path.extname(file)}`;
    headers.set("Content-Disposition", `attachment; filename="lfi-video${path.extname(file)}"; filename*=UTF-8''${encodeURIComponent(name)}`);
  }

  // Byte ranges let the browser's video player seek.
  const range = request.headers.get("range")?.match(/bytes=(\d*)-(\d*)/);
  if (range && (range[1] || range[2])) {
    const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
    const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    if (start >= size || start > end) {
      return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    }
    headers.set("Content-Range", `bytes ${start}-${end}/${size}`);
    headers.set("Content-Length", String(end - start + 1));
    const stream = Readable.toWeb(fs.createReadStream(file, { start, end })) as ReadableStream;
    return new Response(stream, { status: 206, headers });
  }
  headers.set("Content-Length", String(size));
  return new Response(Readable.toWeb(fs.createReadStream(file)) as ReadableStream, { headers });
}

// Turn extracted pictures into clean JPEG files, and small previews for Claude.
import { createHash } from "node:crypto";
import sharp from "sharp";
import type { RawPicture } from "./read-files";

const MIN_SIDE = 100; // smaller pictures are icons or bullets
const MAX_SIDE = 1920;
export const MAX_PICTURES = 15;

export interface PreparedPicture {
  jpeg: Buffer;
  preview: Buffer;
  width: number;
  height: number;
  source: string;
  pageRender: boolean;
}

export async function preparePictures(raw: RawPicture[]): Promise<{ pictures: PreparedPicture[]; skipped: number }> {
  const pictures: PreparedPicture[] = [];
  const seen = new Set<string>();
  let skipped = 0;
  for (const r of raw) {
    if (pictures.length >= MAX_PICTURES) break;
    try {
      const input =
        r.format === "raw"
          ? sharp(r.data, { raw: { width: r.width!, height: r.height!, channels: r.channels! } })
          : sharp(r.data, { animated: false });
      const meta = await input.metadata();
      const w = r.width ?? meta.width ?? 0;
      const h = r.height ?? meta.height ?? 0;
      if (w < MIN_SIDE || h < MIN_SIDE) continue;
      const jpeg = await input
        .rotate()
        .flatten({ background: "#ffffff" })
        .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 90 })
        .toBuffer({ resolveWithObject: true });
      const hash = createHash("sha1").update(jpeg.data).digest("hex");
      if (seen.has(hash)) continue;
      seen.add(hash);
      const preview = await sharp(jpeg.data)
        .resize({ width: 1024, height: 1024, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 78 })
        .toBuffer();
      pictures.push({
        jpeg: jpeg.data,
        preview,
        width: jpeg.info.width,
        height: jpeg.info.height,
        source: r.source,
        pageRender: Boolean(r.pageRender),
      });
    } catch {
      skipped++;
    }
  }
  return { pictures, skipped };
}

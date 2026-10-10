// Pull the text and pictures out of an uploaded LFI alert (PPTX or PDF).
// The file itself is never written to disk.
import JSZip from "jszip";

export interface RawPicture {
  data: Buffer;
  /** Encoded image (PPTX) or raw pixels (PDF). */
  format: "encoded" | "raw";
  width?: number;
  height?: number;
  channels?: 1 | 3 | 4;
  /** Where it came from, e.g. "Slide 1" or "Page 2". */
  source: string;
  /** Whole page rendered as a picture (PDF fallback). */
  pageRender?: boolean;
}

export interface FileContents {
  type: "pdf" | "pptx";
  text: string;
  pictures: RawPicture[];
  /** Pictures that could not be read (e.g. EMF drawings). */
  skipped: number;
}

export function detectType(buf: Buffer, name: string): "pdf" | "pptx" | null {
  if (buf.subarray(0, 5).toString("latin1") === "%PDF-") return "pdf";
  if (buf[0] === 0x50 && buf[1] === 0x4b && /\.pptx$/i.test(name)) return "pptx";
  return null;
}

// ---------------------------------------------------------------------------
// PPTX
// ---------------------------------------------------------------------------

const decodeXml = (s: string) =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");

function attrs(tag: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of tag.matchAll(/([\w:]+)="([^"]*)"/g)) out[m[1]] = m[2];
  return out;
}

function relationships(xml: string | undefined) {
  return [...(xml ?? "").matchAll(/<Relationship\b[^>]*>/g)].map((m) => attrs(m[0]));
}

/** Resolve "../media/image1.png" against "ppt/slides/". */
function resolvePath(base: string, target: string): string {
  const parts = base.split("/").filter(Boolean);
  for (const seg of target.split("/")) {
    if (seg === "..") parts.pop();
    else if (seg && seg !== ".") parts.push(seg);
  }
  return parts.join("/");
}

/** Slide text with table cells separated by " | " and one line per paragraph or row. */
function slideText(xml: string): string {
  let out = "";
  for (const m of xml.matchAll(/<a:t(?:\s[^>]*)?>([^<]*)<\/a:t>|<\/a:p>|<a:br\/>|<\/a:tc>|<\/a:tr>/g)) {
    if (m[1] !== undefined) out += decodeXml(m[1]);
    else if (m[0] === "</a:tc>") out = out.replace(/\n$/, "") + " | ";
    else if (m[0] === "</a:p>" && out.endsWith(" | ")) continue;
    else out += "\n";
  }
  return out
    .split("\n")
    .map((l) => l.replace(/\s*\|\s*$/, "").trim())
    .filter(Boolean)
    .join("\n");
}

export async function readPptx(buf: Buffer): Promise<FileContents> {
  const zip = await JSZip.loadAsync(buf);
  const read = (p: string) => zip.file(p)?.async("string");
  const pres = await read("ppt/presentation.xml");
  if (!pres) throw new Error("This PPTX file has no slides.");
  const presRels = new Map(relationships(await read("ppt/_rels/presentation.xml.rels")).map((r) => [r.Id, r.Target]));
  const slidePaths = [...pres.matchAll(/<p:sldId\b[^>]*>/g)]
    .map((m) => presRels.get(attrs(m[0])["r:id"]))
    .filter((t): t is string => Boolean(t))
    .map((t) => resolvePath("ppt", t));

  const texts: string[] = [];
  const pictures: RawPicture[] = [];
  const seen = new Set<string>();
  let skipped = 0;
  for (const [i, slidePath] of slidePaths.entries()) {
    const xml = await read(slidePath);
    if (!xml) continue;
    texts.push(`--- Slide ${i + 1} ---\n${slideText(xml)}`);
    const dir = slidePath.slice(0, slidePath.lastIndexOf("/"));
    const relsPath = `${dir}/_rels/${slidePath.slice(dir.length + 1)}.rels`;
    const rels = new Map(
      relationships(await read(relsPath))
        .filter((r) => /\/image$/.test(r.Type ?? "") && r.TargetMode !== "External")
        .map((r) => [r.Id, resolvePath(dir, r.Target)]),
    );
    // Pictures in the order they are placed on the slide.
    const ids = [...xml.matchAll(/r:embed="([^"]+)"/g)].map((m) => m[1]);
    for (const id of ids) {
      const media = rels.get(id);
      if (!media || seen.has(media)) continue;
      seen.add(media);
      if (!/\.(png|jpe?g|gif|tiff?|webp|svg)$/i.test(media)) {
        skipped++;
        continue;
      }
      const data = await zip.file(media)?.async("nodebuffer");
      if (data) pictures.push({ data, format: "encoded", source: `Slide ${i + 1}` });
    }
  }
  return { type: "pptx", text: texts.join("\n\n"), pictures, skipped };
}

// ---------------------------------------------------------------------------
// PDF
// ---------------------------------------------------------------------------

const MAX_PAGES_TO_RENDER = 3;

export async function readPdf(buf: Buffer): Promise<FileContents> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = pdfjs.getDocument({ data: new Uint8Array(buf), verbosity: 0 });
  const doc = await task.promise;
  const imageOps = new Set<number>([pdfjs.OPS.paintImageXObject, pdfjs.OPS.paintImageXObjectRepeat]);
  const texts: string[] = [];
  const pictures: RawPicture[] = [];
  const seen = new Set<string>();
  try {
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const content = await page.getTextContent();
      texts.push(
        `--- Page ${p} ---\n` +
          content.items.map((it) => ("str" in it ? it.str + (it.hasEOL ? "\n" : " ") : "")).join(""),
      );
      const ops = await page.getOperatorList();
      for (let i = 0; i < ops.fnArray.length; i++) {
        if (!imageOps.has(ops.fnArray[i])) continue;
        const name = ops.argsArray[i][0] as string;
        if (seen.has(name)) continue;
        seen.add(name);
        const store = name.startsWith("g_") ? page.commonObjs : page.objs;
        const img = await new Promise<{ width: number; height: number; kind: number; data?: Uint8ClampedArray } | null>(
          (resolve) => {
            try {
              store.get(name, resolve);
            } catch {
              resolve(null);
            }
          },
        );
        if (!img?.data) continue;
        const pixels = toPixels(img.data, img.width, img.height, img.kind);
        if (pixels) pictures.push({ ...pixels, format: "raw", source: `Page ${p}` });
      }
    }

    // No pictures could be pulled out: use pictures of the pages instead.
    if (pictures.length === 0) {
      const { createCanvas } = await import("@napi-rs/canvas");
      for (let p = 1; p <= Math.min(doc.numPages, MAX_PAGES_TO_RENDER); p++) {
        const page = await doc.getPage(p);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
        await page.render({
          canvas: canvas as unknown as HTMLCanvasElement,
          canvasContext: canvas.getContext("2d") as unknown as CanvasRenderingContext2D,
          viewport,
        }).promise;
        pictures.push({ data: canvas.toBuffer("image/png"), format: "encoded", source: `Page ${p}`, pageRender: true });
      }
    }
  } finally {
    await task.destroy();
  }
  return { type: "pdf", text: texts.join("\n\n"), pictures, skipped: 0 };
}

/** pdf.js image data -> 8-bit pixels with 1, 3 or 4 channels. */
function toPixels(data: Uint8ClampedArray, width: number, height: number, kind: number) {
  if (kind === 3) return { data: Buffer.from(data.buffer, data.byteOffset, width * height * 4), width, height, channels: 4 as const };
  if (kind === 2) return { data: Buffer.from(data.buffer, data.byteOffset, width * height * 3), width, height, channels: 3 as const };
  if (kind === 1) {
    // 1 bit per pixel, rows padded to whole bytes.
    const rowBytes = Math.ceil(width / 8);
    const out = Buffer.alloc(width * height);
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) out[y * width + x] = data[y * rowBytes + (x >> 3)] & (0x80 >> (x & 7)) ? 255 : 0;
    return { data: out, width, height, channels: 1 as const };
  }
  return null;
}

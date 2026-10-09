// Node-only: turns VideoProps into an MP4 and a thumbnail using Remotion.
// Runs inside the background render worker, never in the web server process.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import { FPS, type VideoProps } from "../video";

const ROOT = process.cwd();

function browserExecutable(): string | null {
  return process.env.REMOTION_BROWSER_EXECUTABLE || null;
}

function licenseKey(): string | null {
  return process.env.REMOTION_LICENSE_KEY || null;
}

/**
 * Bundle the video templates. Audio files are copied into a temporary
 * public folder together with the logo and fonts, so the renderer can load them.
 */
export async function bundleVideo(opts: { audioDir: string | null; onProgress?: (p: number) => void }) {
  const publicDir = fs.mkdtempSync(path.join(os.tmpdir(), "lfi-public-"));
  fs.cpSync(path.join(ROOT, "public"), publicDir, { recursive: true });
  if (opts.audioDir && fs.existsSync(opts.audioDir)) {
    fs.cpSync(opts.audioDir, path.join(publicDir, "audio"), { recursive: true });
  }
  const serveUrl = await bundle({
    entryPoint: path.join(ROOT, "src", "remotion", "index.ts"),
    publicDir,
    onProgress: (p) => opts.onProgress?.(p / 100),
    webpackOverride: (config) => ({
      ...config,
      resolve: {
        ...config.resolve,
        alias: {
          ...(config.resolve?.alias ?? {}),
          "@brand": path.join(ROOT, "brand.config.ts"),
          "@": path.join(ROOT, "src"),
        },
      },
    }),
  });
  return { serveUrl, cleanup: () => fs.rmSync(publicDir, { recursive: true, force: true }) };
}

export async function renderVideo(opts: {
  serveUrl: string;
  props: VideoProps;
  outFile: string;
  onProgress?: (p: number) => void;
}) {
  const composition = await selectComposition({
    serveUrl: opts.serveUrl,
    id: "LfiVideo",
    inputProps: opts.props,
    browserExecutable: browserExecutable(),
  });
  await renderMedia({
    serveUrl: opts.serveUrl,
    composition,
    codec: "h264",
    inputProps: opts.props,
    outputLocation: opts.outFile,
    browserExecutable: browserExecutable(),
    // WhatsApp and most phones need standard-range yuv420p.
    pixelFormat: "yuv420p",
    colorSpace: "bt709",
    crf: 23,
    audioCodec: "aac",
    // Silent videos still get an audio track; some players reject video-only MP4s.
    enforceAudioTrack: true,
    onProgress: ({ progress }) => opts.onProgress?.(progress),
    licenseKey: licenseKey(),
  });
  return composition;
}

export async function renderThumbnail(opts: { serveUrl: string; props: VideoProps; outFile: string }) {
  const composition = await selectComposition({
    serveUrl: opts.serveUrl,
    id: "LfiVideo",
    inputProps: opts.props,
    browserExecutable: browserExecutable(),
  });
  // 2 seconds in: the title card's animations have settled.
  const frame = Math.min(composition.durationInFrames - 1, FPS * 2);
  await renderStill({
    serveUrl: opts.serveUrl,
    composition,
    frame,
    inputProps: opts.props,
    output: opts.outFile,
    imageFormat: "jpeg",
    jpegQuality: 88,
    browserExecutable: browserExecutable(),
    licenseKey: licenseKey(),
  });
}

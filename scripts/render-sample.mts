// Render a sample video without the web app - useful to check that video
// rendering works on this computer.
//   npm run render:sample                      (English, 16:9)
//   npm run render:sample -- ar 9:16           (Arabic, vertical)
//   npm run render:sample -- en 16:9 still     (only the thumbnail)
import fs from "node:fs";
import path from "node:path";
import { DEMO_STORYBOARDS } from "../src/samples/demo-storyboards";
import type { VideoProps } from "../src/lib/video";
import { completeStoryboard } from "../src/lib/schema";
import { bundleVideo, renderThumbnail, renderVideo } from "../src/lib/render/remotion";

const [lang = "en", ratio = "16:9", mode = "video"] = process.argv.slice(2) as ["en" | "ar", "16:9" | "9:16", string];
const sampleId = lang === "ar" ? "line-of-fire" : "dropped-object";
const raw = DEMO_STORYBOARDS[sampleId][lang];
const props: VideoProps = {
  storyboard: completeStoryboard(raw, lang),
  aspectRatio: ratio,
  audio: null,
  audioBase: null,
};

const outDir = path.resolve(process.env.LFI_DATA_DIR || "./data", "samples");
fs.mkdirSync(outDir, { recursive: true });
const base = path.join(outDir, `${sampleId}-${lang}-${ratio.replace(":", "x")}`);

console.log("Bundling video templates…");
const { serveUrl, cleanup } = await bundleVideo({ audioDir: null });
try {
  await renderThumbnail({ serveUrl, props, outFile: `${base}.jpg` });
  console.log(`Thumbnail: ${base}.jpg`);
  if (mode !== "still") {
    let last = -1;
    await renderVideo({
      serveUrl,
      props,
      outFile: `${base}.mp4`,
      onProgress: (p) => {
        const pct = Math.floor(p * 100);
        if (pct % 10 === 0 && pct !== last) {
          console.log(`Rendering ${pct}%`);
          last = pct;
        }
      },
    });
    console.log(`Video: ${base}.mp4`);
  }
} finally {
  cleanup();
}

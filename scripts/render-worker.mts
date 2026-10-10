// Background render job for one project. Started by the web app
// (src/lib/render/start.ts) as a separate process, so a long render never
// blocks or crashes the web server.
//   Usage: tsx scripts/render-worker.mts <projectId>
import fs from "node:fs";
import path from "node:path";

// Load settings when started by hand (the web app passes them already).
for (const f of [".env.local", ".env"]) {
  if (fs.existsSync(f)) process.loadEnvFile(f);
}

const { getProject, setAudioManifest, updateRender, finishRender, failRender, setRenderPid } = await import(
  "../src/lib/db"
);
const { projectDir, audioDir, imagesDir } = await import("../src/lib/storage");
const { generateVoiceover } = await import("../src/lib/tts/voiceover");
const { TtsError } = await import("../src/lib/tts/types");
const { buildSrt, buildTimeline, FPS } = await import("../src/lib/video");
const { bundleVideo, renderThumbnail, renderVideo } = await import("../src/lib/render/remotion");
const { notifyRenderFinished } = await import("../src/lib/notify");

const projectId = process.argv[2];
if (!projectId) {
  console.error("Usage: render-worker <projectId>");
  process.exit(2);
}

const log = (...a: unknown[]) => console.log(new Date().toISOString(), `[${projectId.slice(0, 8)}]`, ...a);

async function main() {
  const project = getProject(projectId);
  if (!project) throw new Error("Project not found");
  setRenderPid(projectId, process.pid);
  const dir = projectDir(projectId);
  fs.mkdirSync(dir, { recursive: true });

  // 1. Voiceover (0-15%)
  updateRender(projectId, "Generating voiceover", 0.02);
  log("voiceover");
  const audio = await generateVoiceover(projectId, project.storyboard, project.audio, (done, total) =>
    updateRender(projectId, `Generating voiceover (${done}/${total})`, 0.02 + 0.13 * (done / total)),
  );
  setAudioManifest(projectId, audio);

  const props = {
    storyboard: project.storyboard,
    aspectRatio: project.aspectRatio,
    audio,
    audioBase: null,
  };

  // 2. Bundle the templates (15-25%)
  updateRender(projectId, "Preparing video templates", 0.15);
  log("bundle");
  const { serveUrl, cleanup } = await bundleVideo({
    audioDir: audio ? audioDir(projectId) : null,
    imageDir: imagesDir(projectId),
    onProgress: (p) => updateRender(projectId, "Preparing video templates", 0.15 + 0.1 * p),
  });

  try {
    // 3. Render frames and encode (25-95%)
    const videoFile = "video.mp4";
    let lastPct = -1;
    log("render");
    await renderVideo({
      serveUrl,
      props,
      outFile: path.join(dir, videoFile),
      onProgress: (p) => {
        const pct = Math.floor(p * 100);
        if (pct === lastPct) return;
        lastPct = pct;
        updateRender(projectId, `Rendering video (${pct}%)`, 0.25 + 0.7 * p);
      },
    });

    // 4. Thumbnail and subtitles file
    updateRender(projectId, "Creating thumbnail", 0.96);
    log("thumbnail");
    const thumbFile = "thumbnail.jpg";
    await renderThumbnail({ serveUrl, props, outFile: path.join(dir, thumbFile) });
    fs.writeFileSync(path.join(dir, "subtitles.srt"), buildSrt(props));

    const videoSeconds = buildTimeline(props).durationInFrames / FPS;
    finishRender(projectId, { videoFile, thumbFile, videoSeconds });
    log("done", `${videoSeconds.toFixed(1)}s`);
  } finally {
    cleanup();
  }
}

/** WhatsApp / API callback; a failure here must not undo a finished render. */
async function notify() {
  try {
    await notifyRenderFinished(projectId);
  } catch (err) {
    log("notification failed", err);
  }
}

main()
  .then(async () => {
    await notify();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error(err);
    const message =
      err instanceof TtsError
        ? err.message
        : `Render failed: ${err instanceof Error ? err.message : String(err)}`;
    failRender(projectId, message);
    await notify();
    process.exit(1);
  });

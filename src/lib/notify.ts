// Tell whoever started a project that its video is ready (or failed):
// WhatsApp users get the video in the chat; API callers get a callback.
// Runs in the render worker.
import fs from "node:fs";
import path from "node:path";
import { getProject } from "./db";
import { projectDir } from "./storage";
import { hmac } from "./secret";
import { projectForApi } from "./api-view";
import { publicBaseUrl, shareUrl } from "./share";
import { WHATSAPP_VIDEO_LIMIT_BYTES, sendText, sendVideoFile, whatsAppConfigured } from "./whatsapp/client";
import { T, videoCaption } from "./whatsapp/messages";

export async function notifyRenderFinished(projectId: string) {
  const p = getProject(projectId);
  if (!p) return;
  const ok = p.status === "done";

  if (p.origin === "whatsapp" && p.originContact && whatsAppConfigured()) {
    const to = p.originContact;
    const link = ok && publicBaseUrl() ? shareUrl(p.id, "video.mp4") : null;
    if (!ok) {
      await sendText(to, T.renderFailed[p.language]);
    } else {
      const file = path.join(projectDir(p.id), "video.mp4");
      const small = fs.statSync(file).size <= WHATSAPP_VIDEO_LIMIT_BYTES;
      try {
        if (!small) throw new Error("video larger than WhatsApp's 16 MB limit");
        await sendVideoFile(to, file, videoCaption(p, link));
      } catch (err) {
        console.error("Sending video on WhatsApp failed; sending a link instead", err);
        await sendText(
          to,
          videoCaption(p, link) +
            (link ? "" : "\n(The video is ready in the LFI Video Studio web app.)"),
        );
      }
    }
  }

  if (p.callbackUrl) {
    const body = JSON.stringify({ event: ok ? "video.ready" : "video.failed", project: projectForApi(p) });
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    // Lets the receiver check the call really came from this app.
    if (process.env.LFI_CALLBACK_SECRET) {
      headers["X-LFI-Signature"] =
        "sha256=" + Buffer.from(hmac(body, process.env.LFI_CALLBACK_SECRET), "base64url").toString("hex");
    }
    const res = await fetch(p.callbackUrl, { method: "POST", headers, body, signal: AbortSignal.timeout(15000) });
    if (!res.ok) console.error(`Callback to ${p.callbackUrl} returned ${res.status}`);
  }
}

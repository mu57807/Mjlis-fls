// Signed, expiring links to a finished video or thumbnail, for sending
// outside the app (WhatsApp, API callers). No login needed to open them.
import { signToken, verifyToken } from "./secret";

export type ShareFile = "video.mp4" | "thumbnail.jpg";
const DEFAULT_DAYS = 7;

/** Base URL people outside this computer use to reach the app, e.g. https://lfi.example.com */
export function publicBaseUrl(): string | null {
  return process.env.APP_BASE_URL?.replace(/\/$/, "") || null;
}

export function shareToken(projectId: string, file: ShareFile, days = DEFAULT_DAYS): string {
  return signToken({ p: projectId, f: file }, days * 24 * 3600);
}

export function readShareToken(token: string): { projectId: string; file: ShareFile } | null {
  const data = verifyToken<{ p: string; f: ShareFile }>(token);
  if (!data || (data.f !== "video.mp4" && data.f !== "thumbnail.jpg")) return null;
  return { projectId: data.p, file: data.f };
}

/** Full share URL, or a relative one if APP_BASE_URL is not set. */
export function shareUrl(projectId: string, file: ShareFile, days = DEFAULT_DAYS): string {
  const ext = file.split(".")[1];
  return `${publicBaseUrl() ?? ""}/api/share/${shareToken(projectId, file, days)}/lfi.${ext}`;
}

export function reviewUrl(projectId: string): string {
  return `${publicBaseUrl() ?? ""}/projects/${projectId}`;
}

import { createHash } from "node:crypto";
import { safeEqual } from "./secret";

/**
 * API keys for other systems (e.g. a WhatsApp agent), from LFI_API_KEYS
 * (comma-separated). Callers send:  Authorization: Bearer <key>
 */
export function checkApiKey(request: Request): Response | null {
  const keys = (process.env.LFI_API_KEYS ?? "")
    .split(",")
    .map((k) => k.trim())
    .filter((k) => k.length >= 16);
  if (keys.length === 0) {
    return Response.json({ error: "The API is disabled (no LFI_API_KEYS set)." }, { status: 503 });
  }
  const given = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() ?? "";
  const h = (s: string) => createHash("sha256").update(s).digest("hex");
  const ok = keys.some((k) => safeEqual(h(k), h(given)));
  return ok ? null : Response.json({ error: "Invalid API key." }, { status: 401 });
}

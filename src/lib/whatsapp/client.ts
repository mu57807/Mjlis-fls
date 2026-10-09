// Minimal client for the WhatsApp Business Cloud API (Meta).
// Docs: https://developers.facebook.com/docs/whatsapp/cloud-api
import fs from "node:fs";
import path from "node:path";

export class WhatsAppError extends Error {}

function config() {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) {
    throw new WhatsAppError("WhatsApp is not set up (WHATSAPP_TOKEN / WHATSAPP_PHONE_NUMBER_ID).");
  }
  const base = (process.env.WHATSAPP_GRAPH_URL || "https://graph.facebook.com").replace(/\/$/, "");
  const version = process.env.WHATSAPP_API_VERSION || "v23.0";
  return { token, url: `${base}/${version}/${phoneNumberId}` };
}

export function whatsAppConfigured(): boolean {
  return Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

async function call(endpoint: "messages" | "media", body: BodyInit, json: boolean) {
  const { token, url } = config();
  const res = await fetch(`${url}/${endpoint}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, ...(json ? { "Content-Type": "application/json" } : {}) },
    body,
  });
  const data = (await res.json().catch(() => ({}))) as { error?: { message?: string }; id?: string };
  if (!res.ok) throw new WhatsAppError(`WhatsApp API ${res.status}: ${data.error?.message ?? "unknown error"}`);
  return data;
}

function send(to: string, message: Record<string, unknown>) {
  return call("messages", JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to, ...message }), true);
}

/** WhatsApp limit for a text message body. */
export const MAX_TEXT = 4096;

export function sendText(to: string, body: string) {
  const text = body.length > MAX_TEXT ? body.slice(0, MAX_TEXT - 1) + "…" : body;
  return send(to, { type: "text", text: { body: text, preview_url: false } });
}

/** Up to 3 quick-reply buttons (title max 20 characters, body max 1024). */
export function sendButtons(to: string, body: string, buttons: { id: string; title: string }[]) {
  return send(to, {
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: body.slice(0, 1024) },
      action: { buttons: buttons.slice(0, 3).map((b) => ({ type: "reply", reply: { id: b.id, title: b.title.slice(0, 20) } })) },
    },
  });
}

/** Upload a local file (max 16 MB for video) and send it as a video message. */
export async function sendVideoFile(to: string, file: string, caption: string) {
  const form = new FormData();
  form.append("messaging_product", "whatsapp");
  form.append("type", "video/mp4");
  form.append("file", new Blob([fs.readFileSync(file)], { type: "video/mp4" }), path.basename(file));
  const media = await call("media", form, false);
  if (!media.id) throw new WhatsAppError("WhatsApp did not return a media id.");
  return send(to, { type: "video", video: { id: media.id, caption: caption.slice(0, 1024) } });
}

export function markRead(messageId: string) {
  return call("messages", JSON.stringify({ messaging_product: "whatsapp", status: "read", message_id: messageId }), true);
}

export const WHATSAPP_VIDEO_LIMIT_BYTES = 16 * 1024 * 1024;

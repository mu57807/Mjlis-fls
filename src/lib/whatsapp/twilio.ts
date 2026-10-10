// Twilio WhatsApp (e.g. the Twilio Sandbox): plain fetch, no SDK.
// Docs: https://www.twilio.com/docs/whatsapp
import { createHmac } from "node:crypto";
import { safeEqual } from "../secret";
import { normalizeNumber } from "./numbers";

/** Twilio's limit for one WhatsApp message body. */
export const TWILIO_MAX_BODY = 1600;
/** Twilio's limit for media sent on WhatsApp. */
export const TWILIO_MEDIA_LIMIT_BYTES = 16 * 1024 * 1024;

export class TwilioError extends Error {
  constructor(
    message: string,
    public code?: number,
  ) {
    super(message);
  }
}

function config() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;
  if (!sid || !token || !from) {
    throw new TwilioError("Twilio is not set up (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_WHATSAPP_FROM).");
  }
  const base = (process.env.TWILIO_API_URL || "https://api.twilio.com").replace(/\/$/, "");
  return { sid, token, from: from.startsWith("whatsapp:") ? from : `whatsapp:${from}`, base };
}

export function twilioConfigured(): boolean {
  return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_FROM);
}

const basicAuth = (sid: string, token: string) => "Basic " + Buffer.from(`${sid}:${token}`).toString("base64");

/**
 * Twilio's request signature: Base64(HMAC-SHA1(auth token, full URL + every
 * POST parameter name and value, sorted by name)).
 * https://www.twilio.com/docs/usage/webhooks/webhooks-security
 */
export function twilioSignature(authToken: string, url: string, params: Record<string, string>): string {
  const data = url + Object.keys(params).sort().map((k) => k + params[k]).join("");
  return createHmac("sha1", authToken).update(data, "utf8").digest("base64");
}

export function validateTwilioSignature(
  authToken: string,
  url: string,
  params: Record<string, string>,
  signature: string | null,
): boolean {
  if (!authToken || !signature) return false;
  return safeEqual(twilioSignature(authToken, url, params), signature);
}

/** Split long text at line breaks so each part fits Twilio's 1600-character limit. */
export function splitMessage(body: string, max = TWILIO_MAX_BODY): string[] {
  if (body.length <= max) return [body];
  const parts: string[] = [];
  let current = "";
  for (const line of body.split("\n")) {
    // A single line that is too long is cut at a space.
    let rest = line;
    while (rest.length > max) {
      const cut = rest.lastIndexOf(" ", max) > max / 2 ? rest.lastIndexOf(" ", max) : max;
      if (current) {
        parts.push(current);
        current = "";
      }
      parts.push(rest.slice(0, cut));
      rest = rest.slice(cut).trimStart();
    }
    if (current && current.length + 1 + rest.length > max) {
      parts.push(current);
      current = rest;
    } else {
      current = current ? `${current}\n${rest}` : rest;
    }
  }
  if (current) parts.push(current);
  return parts;
}

/** Send one WhatsApp message (optionally with a public media URL). */
export async function twilioSend(to: string, body: string, mediaUrl?: string): Promise<string> {
  const { sid, token, from, base } = config();
  const form = new URLSearchParams({ From: from, To: `whatsapp:+${normalizeNumber(to)}`, Body: body });
  if (mediaUrl) form.set("MediaUrl", mediaUrl);
  const res = await fetch(`${base}/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`, {
    method: "POST",
    headers: { Authorization: basicAuth(sid, token), "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
    signal: AbortSignal.timeout(20000),
  });
  const data = (await res.json().catch(() => ({}))) as { sid?: string; code?: number; message?: string };
  if (!res.ok) {
    throw new TwilioError(`Twilio error ${data.code ?? res.status}: ${data.message ?? "unknown error"}`, data.code);
  }
  return data.sid ?? "";
}

/** Send text, split into several messages if needed. */
export async function twilioSendText(to: string, body: string) {
  for (const part of splitMessage(body)) await twilioSend(to, part);
}

/** Download a file someone sent (Twilio media URLs need the account credentials). */
export async function downloadTwilioMedia(url: string, maxBytes: number): Promise<Buffer> {
  const { sid, token } = config();
  if (!/^https:\/\//.test(url) && !process.env.TWILIO_API_URL) throw new TwilioError("Unexpected media URL");
  const res = await fetch(url, { headers: { Authorization: basicAuth(sid, token) }, signal: AbortSignal.timeout(60000) });
  if (!res.ok) throw new TwilioError(`Could not download the file from Twilio (${res.status}).`);
  const length = Number(res.headers.get("content-length") ?? 0);
  if (length > maxBytes) throw new TwilioError("The file is too large.");
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > maxBytes) throw new TwilioError("The file is too large.");
  return buf;
}

import { after } from "next/server";
import { markMessageSeen } from "@/lib/db";
import { hmac, safeEqual } from "@/lib/secret";
import { handleInbound, type InboundMessage } from "@/lib/whatsapp/bot";

// Webhook for the WhatsApp Business Cloud API (set this URL in the Meta app:
// <APP_BASE_URL>/api/whatsapp/webhook, subscribe to the "messages" field).

// GET: Meta checks the webhook once when you set it up.
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams;
  const expected = process.env.WHATSAPP_VERIFY_TOKEN;
  if (expected && q.get("hub.mode") === "subscribe" && q.get("hub.verify_token") === expected) {
    return new Response(q.get("hub.challenge") ?? "", { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

interface WebhookPayload {
  entry?: {
    changes?: {
      value?: {
        messages?: {
          id: string;
          from: string;
          type: string;
          text?: { body: string };
          interactive?: { type: string; button_reply?: { id: string; title: string } };
          button?: { payload?: string; text?: string };
        }[];
      };
    }[];
  }[];
}

// POST: incoming messages. Answer quickly; the work happens after the response.
export async function POST(request: Request) {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret) return new Response("WhatsApp is not configured", { status: 503 });

  // Only accept messages signed by Meta with our app secret.
  const raw = await request.text();
  const signature = request.headers.get("x-hub-signature-256") ?? "";
  const expected = "sha256=" + Buffer.from(hmac(raw, appSecret), "base64url").toString("hex");
  if (!safeEqual(signature, expected)) return new Response("Invalid signature", { status: 401 });

  let payload: WebhookPayload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return new Response("Bad JSON", { status: 400 });
  }

  const messages: InboundMessage[] = [];
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const m of change.value?.messages ?? []) {
        // WhatsApp may deliver the same message twice; handle it once.
        if (!m?.id || !m.from || !markMessageSeen(m.id)) continue;
        messages.push({
          id: m.id,
          from: m.from,
          type: m.type,
          text: m.text?.body,
          buttonId: m.interactive?.button_reply?.id ?? m.button?.payload,
        });
      }
    }
  }

  after(async () => {
    for (const m of messages) {
      await handleInbound(m).catch((err) => console.error("WhatsApp message failed", err));
    }
  });
  return new Response("OK", { status: 200 });
}

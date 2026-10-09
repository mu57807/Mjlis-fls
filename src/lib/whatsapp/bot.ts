import "server-only";
import type { AspectRatio, Language } from "../catalog";
import { deleteProject, getProject, projectsForContact } from "../db";
import { StructuringError } from "../claude/structure";
import { approveAndRender, createFromIncident, detectLanguage } from "../pipeline";
import { reviewUrl, shareUrl } from "../share";
import { checkStoryboard } from "../storyboard-checks";
import { markRead, sendButtons, sendText } from "./client";
import { T, statusLine, storyboardSummary } from "./messages";

export interface InboundMessage {
  id: string;
  /** Sender's number, digits only (as WhatsApp sends it). */
  from: string;
  type: string;
  text?: string;
  /** For button taps: the id we gave the button, e.g. "approve:<projectId>". */
  buttonId?: string;
}

const digits = (s: string) => s.replace(/\D/g, "");

/** WHATSAPP_ALLOWED_NUMBERS: comma-separated numbers with country code, or "*" for anyone. */
export function isAllowedSender(from: string): boolean {
  const list = (process.env.WHATSAPP_ALLOWED_NUMBERS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (list.includes("*")) return true;
  return list.map(digits).includes(digits(from));
}

/** Options people can add to their message as hashtags. */
export function parseOptions(raw: string): {
  text: string;
  outputLanguage: Language | "both" | "auto";
  aspectRatio: AspectRatio;
  targetSeconds: 60 | 90;
} {
  const tags = new Set((raw.match(/#[\p{L}\p{N}:]+/gu) ?? []).map((t) => t.slice(1).toLowerCase()));
  const has = (...names: string[]) => names.some((n) => tags.has(n));
  const outputLanguage = has("both", "كلاهما", "الاثنين")
    ? "both"
    : has("ar", "arabic", "عربي")
      ? "ar"
      : has("en", "english", "انجليزي", "إنجليزي")
        ? "en"
        : "auto";
  return {
    text: raw.replace(/#[\p{L}\p{N}:]+/gu, " ").replace(/[ \t]+/g, " ").trim(),
    outputLanguage,
    aspectRatio: has("wide", "16:9", "169", "16x9", "عريض") ? "16:9" : "9:16",
    targetSeconds: has("90") ? 90 : 60,
  };
}

const COMMANDS = {
  help: ["help", "hi", "hello", "start", "مساعدة", "مرحبا", "السلام عليكم"],
  status: ["status", "الحالة", "حالة"],
  approve: ["approve", "yes", "ok", "موافق", "موافقة", "نعم"],
  cancel: ["cancel", "no", "إلغاء", "الغاء", "لا"],
};
const isCommand = (text: string, list: string[]) => list.includes(text.trim().toLowerCase().replace(/[.!؟?]+$/, ""));

export async function handleInbound(msg: InboundMessage): Promise<void> {
  const text = msg.text?.trim() ?? "";
  const lang: Language = text ? detectLanguage(text) : "en";

  if (!isAllowedSender(msg.from)) {
    await sendText(msg.from, `${T.notAllowed.en}\n\n${T.notAllowed.ar}`);
    return;
  }
  await markRead(msg.id).catch(() => {});

  // Button taps
  if (msg.buttonId) {
    const [action, projectId] = msg.buttonId.split(":");
    if (action === "approve") return approve(msg.from, projectId);
    if (action === "cancel") return cancel(msg.from, projectId);
    return;
  }

  if (msg.type !== "text") {
    await sendText(msg.from, `${T.textOnly.en}\n\n${T.textOnly.ar}`);
    return;
  }
  if (isCommand(text, COMMANDS.help)) return void (await sendText(msg.from, T.help[lang]));
  if (isCommand(text, COMMANDS.status)) return status(msg.from, lang);
  if (isCommand(text, COMMANDS.approve)) {
    const draft = projectsForContact(msg.from).find((p) => p.status === "draft");
    return approve(msg.from, draft?.id, lang);
  }
  if (isCommand(text, COMMANDS.cancel)) {
    const draft = projectsForContact(msg.from).find((p) => p.status === "draft");
    return cancel(msg.from, draft?.id, lang);
  }

  const opts = parseOptions(text);
  if (opts.text.length < 40) {
    await sendText(msg.from, T.tooShort[lang]);
    return;
  }
  await newIncident(msg.from, opts, lang);
}

async function newIncident(from: string, opts: ReturnType<typeof parseOptions>, lang: Language) {
  await sendText(from, T.working[lang]);
  let projects;
  try {
    projects = await createFromIncident({
      description: opts.text,
      outputLanguage: opts.outputLanguage,
      aspectRatio: opts.aspectRatio,
      targetSeconds: opts.targetSeconds,
      origin: "whatsapp",
      originContact: from,
    });
  } catch (err) {
    const reason = err instanceof StructuringError ? err.message : "internal error";
    if (!(err instanceof StructuringError)) console.error("WhatsApp storyboard failed", err);
    await sendText(from, T.failed[lang] + reason);
    return;
  }

  for (const [i, p] of projects.entries()) {
    const pl = p.language;
    const label = `${pl === "ar" ? "العربية" : "English"}${projects.length > 1 ? ` (${i + 1}/${projects.length})` : ""}`;
    const identifiers = checkStoryboard(p.storyboard, p.targetSeconds, p.sourceText).identifiers;
    const link = process.env.APP_BASE_URL ? reviewUrl(p.id) : null;
    await sendText(from, storyboardSummary(p, identifiers, link, label));
    await sendButtons(from, `${label}: ${T.approveQuestion[pl]}`, [
      { id: `approve:${p.id}`, title: T.approveButton[pl] },
      { id: `cancel:${p.id}`, title: T.cancelButton[pl] },
    ]);
  }
}

/** Only the person who sent the incident can approve or cancel it from WhatsApp. */
function ownProject(from: string, projectId: string | undefined) {
  if (!projectId || !/^[0-9a-f-]{36}$/i.test(projectId)) return null;
  const p = getProject(projectId);
  return p && p.origin === "whatsapp" && p.originContact === from ? p : null;
}

async function approve(from: string, projectId: string | undefined, fallbackLang: Language = "en") {
  const p = ownProject(from, projectId);
  if (!p) return void (await sendText(from, T.nothingToApprove[fallbackLang]));
  const lang = p.language;
  if (p.status === "rendering") return void (await sendText(from, T.alreadyRendering[lang]));
  if (p.status === "done") return void (await sendText(from, T.alreadyDone[lang]));
  const { error } = approveAndRender(p.id);
  await sendText(from, error ? `${T.renderFailed[lang]} (${error})` : T.rendering[lang]);
}

async function cancel(from: string, projectId: string | undefined, fallbackLang: Language = "en") {
  const p = ownProject(from, projectId);
  if (!p || p.status !== "draft") return void (await sendText(from, T.nothingToApprove[p?.language ?? fallbackLang]));
  deleteProject(p.id);
  await sendText(from, T.cancelled[p.language]);
}

async function status(from: string, lang: Language) {
  const projects = projectsForContact(from, 5);
  if (projects.length === 0) return void (await sendText(from, T.noProjects[lang]));
  const lines = projects.map((p) => {
    const link = p.status === "done" && process.env.APP_BASE_URL ? `\n  ${shareUrl(p.id, "video.mp4")}` : "";
    return statusLine(p, lang) + link;
  });
  await sendText(from, lines.join("\n"));
}

import "server-only";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { AspectRatio, Language } from "./catalog";
import type { ComplianceResult, Media, Project } from "./schema";
import type { ComplianceIssue } from "./compliance";
import {
  approveProject,
  claimRender,
  createProject,
  getAlert,
  getAlertBannedHashes,
  getProject,
  listKnownNames,
  updateAlert,
} from "./db";
import { redactLocally } from "./redact";
import { hashTerms } from "./compliance";
import { isDemoMode } from "./claude/client";
import { structureIncident } from "./claude/structure";
import { buildAlertStoryboard } from "./claude/alert-storyboard";
import { checkAlert } from "./alerts/check";
import { alertDir, imagesDir } from "./storage";
import { runFinalCheck } from "./final-check";
import { startRenderWorker } from "./render/start";

/** Thrown when the APP RULES check finds a company name, an ID or an unchecked picture. */
export class ComplianceBlockedError extends Error {
  constructor(public issues: ComplianceIssue[]) {
    super(`Blocked: ${issues.length} problem(s) must be fixed first (company, person or place names, IDs or unchecked pictures).`);
  }
}

/** Arabic if most letters in the text are Arabic, otherwise English. */
export function detectLanguage(text: string): Language {
  const arabic = (text.match(/[\u0600-\u06FF]/g) ?? []).length;
  const latin = (text.match(/[A-Za-z]/g) ?? []).length;
  return arabic > latin ? "ar" : "en";
}

/**
 * Incident text -> one draft project per output language. Shared by the web
 * form, the API and WhatsApp. Throws StructuringError with a user-safe message.
 */
export async function createFromIncident(input: {
  description: string;
  outputLanguage: Language | "both" | "auto";
  aspectRatio: AspectRatio;
  targetSeconds: 60 | 90;
  origin?: Project["origin"];
  originContact?: string | null;
  callbackUrl?: string | null;
}): Promise<Project[]> {
  const languages: Language[] =
    input.outputLanguage === "both"
      ? ["en", "ar"]
      : input.outputLanguage === "auto"
        ? [detectLanguage(input.description)]
        : [input.outputLanguage];
  // The local clean-up runs before the text is sent to Claude, and only the
  // cleaned text is kept. (Demo mode only accepts the built-in samples.)
  const clean = isDemoMode()
    ? { text: input.description, removed: [] as string[] }
    : redactLocally(input.description, listKnownNames());
  const removedHashes = hashTerms(clean.removed);
  const results = await Promise.all(
    languages.map((language) =>
      structureIncident({ description: clean.text, language, targetSeconds: input.targetSeconds }),
    ),
  );
  const batchId = randomUUID();
  return results.map(({ storyboard, demo, bannedHashes }) =>
    createProject({
      batchId,
      aspectRatio: input.aspectRatio,
      targetSeconds: input.targetSeconds,
      sourceText: clean.text,
      storyboard,
      demo,
      origin: input.origin,
      originContact: input.originContact,
      callbackUrl: input.callbackUrl,
      bannedHashes: [...bannedHashes, ...removedHashes],
    }),
  );
}

/** Reviewed alert -> one draft project per output language, with its pictures. */
export async function createFromAlert(
  alertId: string,
  opts: { outputLanguage: Language | "both" | "auto"; aspectRatio: AspectRatio; targetSeconds: 60 | 90 },
): Promise<Project[]> {
  const alert = getAlert(alertId);
  if (!alert) throw new Error("Alert not found");
  const hashes = getAlertBannedHashes(alertId);
  // Names/IDs known to come from the file must be removed before a storyboard is made.
  // Possible matches and flagged pictures are checked again (strictly) before rendering.
  const issues = checkAlert(alert.fields, alert.pictures, hashes).filter((i) => !i.overridable);
  if (issues.length) throw new ComplianceBlockedError(issues);

  const used = alert.pictures.filter((p) => p.use);
  const media: Media[] = used.map((p) => ({
    file: p.file,
    description: p.description,
    flagged: p.flagged,
    flag_reasons: p.flag_reasons,
    checked: p.checked || !p.flagged,
  }));
  const languages: Language[] =
    opts.outputLanguage === "both" ? ["en", "ar"] : opts.outputLanguage === "auto" ? [alert.documentLanguage] : [opts.outputLanguage];
  const storyboards = await Promise.all(
    languages.map((language) =>
      buildAlertStoryboard({ fields: alert.fields, notes: alert.notes, language, targetSeconds: opts.targetSeconds, media }),
    ),
  );
  const batchId = randomUUID();
  const projects = storyboards.map((storyboard) => {
    const project = createProject({
      batchId,
      aspectRatio: opts.aspectRatio,
      targetSeconds: opts.targetSeconds,
      // The reviewed, rule-checked fields (never the original file).
      sourceText: JSON.stringify(alert.fields, null, 2),
      storyboard,
      demo: false,
      origin: "web",
      bannedHashes: hashes,
      alertId,
    });
    const dir = imagesDir(project.id);
    fs.mkdirSync(dir, { recursive: true });
    for (const m of media) fs.copyFileSync(path.join(alertDir(alertId), "images", m.file), path.join(dir, m.file));
    return project;
  });
  updateAlert(alertId, { projectIds: [...alert.projectIds, ...projects.map((p) => p.id)] });
  return projects;
}

/**
 * The final check, then the render. If a company name, ID or unchecked
 * picture is found, nothing renders and the problems are returned.
 */
export async function renderIfCompliant(
  id: string,
): Promise<{ project: Project | null; error?: string; check?: ComplianceResult }> {
  const existing = getProject(id);
  if (!existing) return { project: null, error: "Not found" };
  if (existing.status === "rendering") return { project: existing };
  if (!existing.approvedAt) return { project: existing, error: "Approve the storyboard before rendering." };
  const check = await runFinalCheck(existing);
  if (check.issues.length > 0) {
    return {
      project: getProject(id),
      check,
      error: `Render blocked by the final check: ${check.issues.length} problem(s) found. Fix them on the review screen.`,
    };
  }
  if (!claimRender(id)) {
    return { project: getProject(id), error: `Cannot render a project that is ${existing.status}.` };
  }
  startRenderWorker(id);
  return { project: getProject(id), check };
}

/** Approve the saved storyboard (if still a draft), run the final check and render. */
export async function approveAndRender(id: string) {
  const existing = getProject(id);
  if (!existing) return { project: null, error: "Not found" };
  if (existing.status === "draft") approveProject(id);
  return renderIfCompliant(id);
}

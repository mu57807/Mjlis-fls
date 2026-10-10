import "server-only";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { alertDir } from "../storage";
import { createAlert } from "../db";
import { hashTerms, scanSourceForSensitiveTerms } from "../compliance";
import { StructuringError } from "../claude/client";
import { extractAlert } from "../claude/extract-alert";
import { detectType, readPdf, readPptx } from "./read-files";
import { preparePictures } from "./images";
import { AlertFieldsSchema, type Alert, type AlertPicture } from "./types";

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

/**
 * Uploaded file -> reviewed-ready alert. The file is only held in memory:
 * it is never saved, so its ID / reference numbers are never stored.
 */
export async function processUpload(file: Buffer, fileName: string): Promise<Alert> {
  const type = detectType(file, fileName);
  if (!type) throw new StructuringError("Please upload a PDF or PowerPoint (.pptx) file.");
  if (file.length > MAX_UPLOAD_BYTES) throw new StructuringError("The file is larger than 20 MB.");

  let contents;
  try {
    contents = type === "pdf" ? await readPdf(file) : await readPptx(file);
  } catch {
    throw new StructuringError(`The ${type.toUpperCase()} file could not be read. Is it damaged or password-protected?`);
  }
  const { pictures: prepared, skipped } = await preparePictures(contents.pictures);
  const ex = await extractAlert(file, contents, prepared);

  // Names and IDs from the file: kept only as hashes for the final check.
  const bannedHashes = hashTerms([...ex.sensitive_terms, ...scanSourceForSensitiveTerms(contents.text)]);

  const id = randomUUID();
  const dir = path.join(alertDir(id), "images");
  fs.mkdirSync(dir, { recursive: true });
  const pictures: AlertPicture[] = prepared.map((p, i) => {
    const file = `pic-${i + 1}.jpg`;
    fs.writeFileSync(path.join(dir, file), p.jpeg);
    const info = ex.pictures.find((x) => x.number === i + 1);
    const kind = p.pageRender ? "document_or_page" : (info?.kind ?? "other");
    const reasons = [...(info?.identify_reasons ?? [])];
    if (p.pageRender) reasons.push("picture of a whole page (contains the document's text)");
    if (kind === "logo_or_branding" && reasons.length === 0) reasons.push("company logo or branding");
    const flagged = Boolean(info?.may_identify) || p.pageRender || kind === "logo_or_branding" || !info;
    return {
      id: `pic-${i + 1}`,
      file,
      original_file: null,
      width: p.width,
      height: p.height,
      source: p.source,
      kind,
      description: info?.description ?? "",
      flagged,
      flag_reasons: flagged && reasons.length === 0 ? ["could not be checked automatically"] : reasons,
      checked: false,
      blurred: false,
      // Incident photos and diagrams go into the video; logos and decoration do not.
      use: kind === "incident_photo" || kind === "diagram",
    };
  });

  const notes = [...ex.removed_notes];
  const unreadable = skipped + contents.skipped;
  if (unreadable > 0) notes.push(`${unreadable} picture(s) could not be read (unsupported format).`);

  // Keep only the form fields (the schema drops everything else, incl. the sensitive terms).
  const fields = AlertFieldsSchema.parse(ex);
  return createAlert({ id, fileType: type, documentLanguage: ex.document_language, fields, pictures, notes }, bannedHashes);
}

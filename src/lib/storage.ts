// Where files live on disk. Everything is under LFI_DATA_DIR (default ./data).
import fs from "node:fs";
import path from "node:path";

export function dataDir(): string {
  // Runtime-configured folder; tell the bundler not to trace it.
  const dir = path.resolve(/*turbopackIgnore: true*/ process.cwd(), process.env.LFI_DATA_DIR || "./data");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/** Folder for one project's audio, video and thumbnail. */
export function projectDir(projectId: string): string {
  if (!/^[0-9a-f-]{36}$/i.test(projectId)) throw new Error("Invalid project id");
  return path.join(dataDir(), "projects", projectId);
}

export function audioDir(projectId: string): string {
  return path.join(projectDir(projectId), "audio");
}

export function imagesDir(projectId: string): string {
  return path.join(projectDir(projectId), "images");
}

/** Folder for an uploaded alert's extracted pictures (the uploaded file itself is not kept). */
export function alertDir(alertId: string): string {
  if (!/^[0-9a-f-]{36}$/i.test(alertId)) throw new Error("Invalid alert id");
  return path.join(dataDir(), "alerts", alertId);
}

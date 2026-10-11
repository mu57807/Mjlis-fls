import path from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { dataDir } from "./storage";
import type { ComplianceResult, Project, ProjectStatus, ProjectSummary, Storyboard } from "./schema";
import type { Alert } from "./alerts/types";
import { hashTerms } from "./compliance";
import type { KnownName, KnownNameKind } from "./known-names";
import type { AudioManifest } from "./video";

// One connection per server process (kept on globalThis so hot reload in
// development does not open a new one on every code change).
const g = globalThis as unknown as { __lfiDb?: DatabaseSync };

/**
 * Node's built-in SQLite (Node 22.13+), so there is nothing to compile on
 * install. Loaded on first use, hiding Node's one-off "experimental" notice.
 */
function loadSqlite(): typeof import("node:sqlite") {
  const original = process.emitWarning;
  process.emitWarning = ((warning: string | Error, ...rest: unknown[]) => {
    const text = typeof warning === "string" ? warning : warning.message;
    if (/SQLite is an experimental feature/.test(text)) return;
    return (original as (...a: unknown[]) => void).call(process, warning, ...rest);
  }) as typeof process.emitWarning;
  try {
    return process.getBuiltinModule("node:sqlite");
  } finally {
    process.emitWarning = original;
  }
}

function db(): DatabaseSync {
  if (!g.__lfiDb) {
    const { DatabaseSync } = loadSqlite();
    const conn = new DatabaseSync(path.join(dataDir(), "lfi.db"));
    // Lets the web app and the render worker use the database at the same time.
    conn.exec("PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000; PRAGMA foreign_keys = ON;");
    migrate(conn);
    g.__lfiDb = conn;
  }
  return g.__lfiDb;
}

// Each entry runs once, in order. Add new entries at the end; never edit old ones.
const MIGRATIONS: string[] = [
  `CREATE TABLE projects (
     id             TEXT PRIMARY KEY,
     batch_id       TEXT NOT NULL,
     created_at     TEXT NOT NULL,
     updated_at     TEXT NOT NULL,
     status         TEXT NOT NULL,
     language       TEXT NOT NULL,
     aspect_ratio   TEXT NOT NULL,
     target_seconds INTEGER NOT NULL,
     source_text    TEXT NOT NULL,
     storyboard     TEXT NOT NULL,
     approved_at    TEXT,
     demo           INTEGER NOT NULL DEFAULT 0
   );
   CREATE INDEX projects_created ON projects(created_at DESC);
   CREATE INDEX projects_batch ON projects(batch_id);`,
  `ALTER TABLE projects ADD COLUMN audio_manifest TEXT;
   ALTER TABLE projects ADD COLUMN render_stage TEXT;
   ALTER TABLE projects ADD COLUMN render_progress REAL NOT NULL DEFAULT 0;
   ALTER TABLE projects ADD COLUMN render_error TEXT;
   ALTER TABLE projects ADD COLUMN render_pid INTEGER;
   ALTER TABLE projects ADD COLUMN render_started_at TEXT;
   ALTER TABLE projects ADD COLUMN video_file TEXT;
   ALTER TABLE projects ADD COLUMN thumb_file TEXT;
   ALTER TABLE projects ADD COLUMN video_seconds REAL;
   ALTER TABLE projects ADD COLUMN rendered_at TEXT;`,
  `ALTER TABLE projects ADD COLUMN origin TEXT NOT NULL DEFAULT 'web';
   ALTER TABLE projects ADD COLUMN origin_contact TEXT;
   ALTER TABLE projects ADD COLUMN callback_url TEXT;
   CREATE INDEX projects_contact ON projects(origin_contact, created_at DESC);
   CREATE TABLE inbound_messages (id TEXT PRIMARY KEY, received_at TEXT NOT NULL);`,
  `CREATE TABLE alerts (
     id                TEXT PRIMARY KEY,
     created_at        TEXT NOT NULL,
     updated_at        TEXT NOT NULL,
     file_type         TEXT NOT NULL,
     document_language TEXT NOT NULL,
     fields            TEXT NOT NULL,
     pictures          TEXT NOT NULL,
     notes             TEXT NOT NULL,
     banned_hashes     TEXT NOT NULL,
     project_ids       TEXT NOT NULL DEFAULT '[]'
   );
   CREATE INDEX alerts_created ON alerts(created_at DESC);
   ALTER TABLE projects ADD COLUMN banned_hashes TEXT NOT NULL DEFAULT '[]';
   ALTER TABLE projects ADD COLUMN compliance_ack TEXT NOT NULL DEFAULT '[]';
   ALTER TABLE projects ADD COLUMN compliance_result TEXT;
   ALTER TABLE projects ADD COLUMN alert_id TEXT;`,
  // Names the local clean-up removes before anything is sent to Claude.
  `CREATE TABLE known_names (
     id          TEXT PRIMARY KEY,
     created_at  TEXT NOT NULL,
     term        TEXT NOT NULL,
     kind        TEXT NOT NULL,
     replacement TEXT NOT NULL
   );`,
];

function migrate(conn: DatabaseSync) {
  const version = Number((conn.prepare("PRAGMA user_version").get() as { user_version: number }).user_version);
  for (let v = version; v < MIGRATIONS.length; v++) {
    conn.exec("BEGIN");
    try {
      conn.exec(MIGRATIONS[v]);
      conn.exec(`PRAGMA user_version = ${v + 1}`);
      conn.exec("COMMIT");
    } catch (err) {
      conn.exec("ROLLBACK");
      throw err;
    }
  }
}

interface ProjectRow {
  id: string;
  batch_id: string;
  created_at: string;
  updated_at: string;
  status: ProjectStatus;
  language: Project["language"];
  aspect_ratio: Project["aspectRatio"];
  target_seconds: 60 | 90;
  source_text: string;
  storyboard: string;
  approved_at: string | null;
  demo: number;
  audio_manifest: string | null;
  render_stage: string | null;
  render_progress: number;
  render_error: string | null;
  render_pid: number | null;
  render_started_at: string | null;
  video_file: string | null;
  thumb_file: string | null;
  video_seconds: number | null;
  rendered_at: string | null;
  origin: Project["origin"];
  origin_contact: string | null;
  callback_url: string | null;
  banned_hashes: string;
  compliance_ack: string;
  compliance_result: string | null;
  alert_id: string | null;
}

function toProject(r: ProjectRow): Project {
  return {
    id: r.id,
    batchId: r.batch_id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    status: r.status,
    language: r.language,
    aspectRatio: r.aspect_ratio,
    targetSeconds: r.target_seconds,
    sourceText: r.source_text,
    storyboard: JSON.parse(r.storyboard) as Storyboard,
    approvedAt: r.approved_at,
    demo: r.demo === 1,
    origin: r.origin,
    originContact: r.origin_contact,
    callbackUrl: r.callback_url,
    alertId: r.alert_id,
    compliance: {
      acknowledged: JSON.parse(r.compliance_ack) as string[],
      lastCheck: r.compliance_result ? (JSON.parse(r.compliance_result) as ComplianceResult) : null,
    },
    audio: r.audio_manifest ? (JSON.parse(r.audio_manifest) as AudioManifest) : null,
    render: {
      stage: r.render_stage,
      progress: r.render_progress,
      error: r.render_error,
      startedAt: r.render_started_at,
      videoFile: r.video_file,
      thumbFile: r.thumb_file,
      videoSeconds: r.video_seconds,
      renderedAt: r.rendered_at,
    },
  };
}

export function createProject(input: {
  batchId: string;
  aspectRatio: Project["aspectRatio"];
  targetSeconds: 60 | 90;
  sourceText: string;
  storyboard: Storyboard;
  demo: boolean;
  origin?: Project["origin"];
  originContact?: string | null;
  callbackUrl?: string | null;
  bannedHashes?: string[];
  alertId?: string | null;
}): Project {
  const now = new Date().toISOString();
  const id = randomUUID();
  db()
    .prepare(
      `INSERT INTO projects (id, batch_id, created_at, updated_at, status, language,
         aspect_ratio, target_seconds, source_text, storyboard, approved_at, demo,
         origin, origin_contact, callback_url, banned_hashes, alert_id)
       VALUES (?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.batchId,
      now,
      now,
      input.storyboard.language,
      input.aspectRatio,
      input.targetSeconds,
      input.sourceText,
      JSON.stringify(input.storyboard),
      input.demo ? 1 : 0,
      input.origin ?? "web",
      input.originContact ?? null,
      input.callbackUrl ?? null,
      JSON.stringify(input.bannedHashes ?? []),
      input.alertId ?? null,
    );
  return getProject(id)!;
}

export function getProject(id: string): Project | null {
  const row = db().prepare(`SELECT * FROM projects WHERE id = ?`).get(id) as
    | ProjectRow
    | undefined;
  if (row && row.status === "rendering" && row.render_pid && !isAlive(row.render_pid)) {
    failRender(id, "The render stopped unexpectedly (the app may have been restarted). Please try again.");
    return getProject(id);
  }
  return row ? toProject(row) : null;
}

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function listProjects(): ProjectSummary[] {
  const rows = db()
    .prepare(`SELECT * FROM projects ORDER BY created_at DESC LIMIT 500`)
    .all() as unknown as ProjectRow[];
  return rows.map((r) => {
    const p = toProject(r);
    return {
      id: p.id,
      batchId: p.batchId,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      status: p.status,
      language: p.language,
      aspectRatio: p.aspectRatio,
      targetSeconds: p.targetSeconds,
      approvedAt: p.approvedAt,
      demo: p.demo,
      render: p.render,
      origin: p.origin,
      originContact: p.originContact,
      callbackUrl: p.callbackUrl,
      alertId: p.alertId,
      compliance: p.compliance,
      title: p.storyboard.title,
      sceneCount: p.storyboard.scenes.length,
    };
  });
}

export function siblingProjects(batchId: string, excludeId: string) {
  return (
    db()
      .prepare(`SELECT id, language FROM projects WHERE batch_id = ? AND id != ?`)
      .all(batchId, excludeId) as { id: string; language: Project["language"] }[]
  );
}

/** Saving an edit always sends the project back to draft: it must be re-approved. */
export function saveStoryboard(
  id: string,
  storyboard: Storyboard,
  settings: { aspectRatio: Project["aspectRatio"]; targetSeconds: 60 | 90 },
): Project | null {
  const now = new Date().toISOString();
  const res = db()
    .prepare(
      `UPDATE projects
         SET storyboard = ?, aspect_ratio = ?, target_seconds = ?,
             updated_at = ?, status = 'draft', approved_at = NULL,
             video_file = NULL, thumb_file = NULL, render_error = NULL, render_stage = NULL
       WHERE id = ?`,
    )
    .run(JSON.stringify(storyboard), settings.aspectRatio, settings.targetSeconds, now, id);
  return res.changes ? getProject(id) : null;
}

export function approveProject(id: string): Project | null {
  const now = new Date().toISOString();
  // Only a draft can be approved; approving twice is harmless.
  db()
    .prepare(
      `UPDATE projects SET status = 'approved', approved_at = ?, updated_at = ?
       WHERE id = ? AND status = 'draft'`,
    )
    .run(now, now, id);
  return getProject(id);
}

export function deleteProject(id: string): boolean {
  return db().prepare(`DELETE FROM projects WHERE id = ?`).run(id).changes > 0;
}

// ---------------------------------------------------------------------------
// Voiceover and rendering
// ---------------------------------------------------------------------------

export function setAudioManifest(id: string, manifest: AudioManifest | null) {
  db()
    .prepare(`UPDATE projects SET audio_manifest = ? WHERE id = ?`)
    .run(manifest ? JSON.stringify(manifest) : null, id);
}

/** Atomically move an approved project into "rendering". Returns false if not allowed. */
export function claimRender(id: string): boolean {
  const res = db()
    .prepare(
      `UPDATE projects
         SET status = 'rendering', render_stage = 'Starting', render_progress = 0,
             render_error = NULL, render_pid = NULL, render_started_at = ?
       WHERE id = ? AND approved_at IS NOT NULL AND status IN ('approved', 'done', 'failed')`,
    )
    .run(new Date().toISOString(), id);
  return res.changes > 0;
}

export function setRenderPid(id: string, pid: number) {
  db().prepare(`UPDATE projects SET render_pid = ? WHERE id = ?`).run(pid, id);
}

export function updateRender(id: string, stage: string, progress: number) {
  db()
    .prepare(`UPDATE projects SET render_stage = ?, render_progress = ? WHERE id = ? AND status = 'rendering'`)
    .run(stage, Math.max(0, Math.min(1, progress)), id);
}

export function finishRender(id: string, r: { videoFile: string; thumbFile: string; videoSeconds: number }) {
  db()
    .prepare(
      `UPDATE projects
         SET status = 'done', render_stage = 'Done', render_progress = 1, render_pid = NULL,
             video_file = ?, thumb_file = ?, video_seconds = ?, rendered_at = ?
       WHERE id = ?`,
    )
    .run(r.videoFile, r.thumbFile, r.videoSeconds, new Date().toISOString(), id);
}

export function failRender(id: string, error: string) {
  db()
    .prepare(
      `UPDATE projects SET status = 'failed', render_error = ?, render_pid = NULL
       WHERE id = ? AND status = 'rendering'`,
    )
    .run(error.slice(0, 2000), id);
}

// ---------------------------------------------------------------------------
// Messaging channels
// ---------------------------------------------------------------------------

/** Most recent projects started from one WhatsApp number. */
export function projectsForContact(contact: string, limit = 5): Project[] {
  const rows = db()
    .prepare(`SELECT * FROM projects WHERE origin_contact = ? ORDER BY created_at DESC LIMIT ?`)
    .all(contact, limit) as unknown as ProjectRow[];
  return rows.map(toProject);
}

/**
 * Remember an incoming message id. Returns false if it was seen before
 * (WhatsApp re-sends a message when it is unsure it was delivered).
 */
export function markMessageSeen(messageId: string): boolean {
  const res = db()
    .prepare(`INSERT OR IGNORE INTO inbound_messages (id, received_at) VALUES (?, ?)`)
    .run(messageId, new Date().toISOString());
  return res.changes > 0;
}

// ---------------------------------------------------------------------------
// Final check (APP RULES)
// ---------------------------------------------------------------------------

/** Hashes of names/IDs found in the source; never sent to the browser. */
/** Hashes of the names/IDs from the project's source, plus everything on the names list. */
export function getBannedHashes(projectId: string): string[] {
  const row = db().prepare(`SELECT banned_hashes FROM projects WHERE id = ?`).get(projectId) as
    | { banned_hashes: string }
    | undefined;
  return [...(row ? (JSON.parse(row.banned_hashes) as string[]) : []), ...knownNameHashes()];
}

export function setComplianceResult(projectId: string, result: ComplianceResult) {
  db().prepare(`UPDATE projects SET compliance_result = ? WHERE id = ?`).run(JSON.stringify(result), projectId);
}

/** A reviewer confirmed these findings are not a company name or ID (or the picture is safe). */
export function acknowledgeIssues(projectId: string, keys: string[]) {
  const p = getProject(projectId);
  if (!p) return null;
  const all = [...new Set([...p.compliance.acknowledged, ...keys])];
  db().prepare(`UPDATE projects SET compliance_ack = ? WHERE id = ?`).run(JSON.stringify(all), projectId);
  return getProject(projectId);
}

// ---------------------------------------------------------------------------
// Uploaded alerts
// ---------------------------------------------------------------------------

interface AlertRow {
  id: string;
  created_at: string;
  updated_at: string;
  file_type: Alert["fileType"];
  document_language: Alert["documentLanguage"];
  fields: string;
  pictures: string;
  notes: string;
  banned_hashes: string;
  project_ids: string;
}

function toAlert(r: AlertRow): Alert {
  return {
    id: r.id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    fileType: r.file_type,
    documentLanguage: r.document_language,
    fields: JSON.parse(r.fields),
    pictures: JSON.parse(r.pictures),
    notes: JSON.parse(r.notes),
    projectIds: JSON.parse(r.project_ids),
  };
}

export function createAlert(a: Omit<Alert, "createdAt" | "updatedAt" | "projectIds">, bannedHashes: string[]) {
  const now = new Date().toISOString();
  db()
    .prepare(
      `INSERT INTO alerts (id, created_at, updated_at, file_type, document_language, fields, pictures, notes, banned_hashes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(a.id, now, now, a.fileType, a.documentLanguage, JSON.stringify(a.fields), JSON.stringify(a.pictures),
      JSON.stringify(a.notes), JSON.stringify(bannedHashes));
  return getAlert(a.id)!;
}

export function getAlert(id: string): Alert | null {
  const row = db().prepare(`SELECT * FROM alerts WHERE id = ?`).get(id) as unknown as AlertRow | undefined;
  return row ? toAlert(row) : null;
}

export function getAlertBannedHashes(id: string): string[] {
  const row = db().prepare(`SELECT banned_hashes FROM alerts WHERE id = ?`).get(id) as { banned_hashes: string } | undefined;
  return [...(row ? (JSON.parse(row.banned_hashes) as string[]) : []), ...knownNameHashes()];
}

export function updateAlert(id: string, patch: Partial<Pick<Alert, "fields" | "pictures" | "projectIds">>) {
  const a = getAlert(id);
  if (!a) return null;
  const next = { ...a, ...patch };
  db()
    .prepare(`UPDATE alerts SET fields = ?, pictures = ?, project_ids = ?, updated_at = ? WHERE id = ?`)
    .run(JSON.stringify(next.fields), JSON.stringify(next.pictures), JSON.stringify(next.projectIds), new Date().toISOString(), id);
  return getAlert(id);
}

export function listAlerts(limit = 50): Alert[] {
  const rows = db().prepare(`SELECT * FROM alerts ORDER BY created_at DESC LIMIT ?`).all(limit) as unknown as AlertRow[];
  return rows.map(toAlert);
}

export function deleteAlert(id: string): boolean {
  return Number(db().prepare(`DELETE FROM alerts WHERE id = ?`).run(id).changes) > 0;
}

// ---------------------------------------------------------------------------
// Known names (company, person and place names to remove locally)
// ---------------------------------------------------------------------------

let knownCache: { key: string; hashes: string[] } | null = null;
/** Every name on the list is checked for, in every project, old and new. */
export function knownNameHashes(): string[] {
  const terms = listKnownNames().map((n) => n.term);
  const key = terms.join("\n");
  if (knownCache?.key !== key) knownCache = { key, hashes: hashTerms(terms) };
  return knownCache.hashes;
}

export function listKnownNames(): KnownName[] {
  return db().prepare(`SELECT id, term, kind, replacement FROM known_names ORDER BY term COLLATE NOCASE`).all() as unknown as KnownName[];
}

export function addKnownName(n: { term: string; kind: KnownNameKind; replacement: string }): KnownName {
  const id = randomUUID();
  db()
    .prepare(`INSERT INTO known_names (id, created_at, term, kind, replacement) VALUES (?, ?, ?, ?, ?)`)
    .run(id, new Date().toISOString(), n.term, n.kind, n.replacement);
  return { id, ...n };
}

export function deleteKnownName(id: string): boolean {
  return Number(db().prepare(`DELETE FROM known_names WHERE id = ?`).run(id).changes) > 0;
}

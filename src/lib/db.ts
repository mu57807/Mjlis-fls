import Database from "better-sqlite3";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { dataDir } from "./storage";
import type { Project, ProjectStatus, ProjectSummary, Storyboard } from "./schema";
import type { AudioManifest } from "./video";

// One connection per server process (kept on globalThis so hot reload in
// development does not open a new one on every code change).
const g = globalThis as unknown as { __lfiDb?: Database.Database };

function db(): Database.Database {
  if (!g.__lfiDb) {
    const conn = new Database(path.join(dataDir(), "lfi.db"));
    conn.pragma("journal_mode = WAL");
    conn.pragma("foreign_keys = ON");
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
];

function migrate(conn: Database.Database) {
  const version = conn.pragma("user_version", { simple: true }) as number;
  for (let v = version; v < MIGRATIONS.length; v++) {
    conn.transaction(() => {
      conn.exec(MIGRATIONS[v]);
      conn.pragma(`user_version = ${v + 1}`);
    })();
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
}): Project {
  const now = new Date().toISOString();
  const id = randomUUID();
  db()
    .prepare(
      `INSERT INTO projects (id, batch_id, created_at, updated_at, status, language,
         aspect_ratio, target_seconds, source_text, storyboard, approved_at, demo,
         origin, origin_contact, callback_url)
       VALUES (?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?)`,
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
    .all() as ProjectRow[];
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
    .all(contact, limit) as ProjectRow[];
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

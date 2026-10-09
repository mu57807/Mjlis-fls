import "server-only";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Project, ProjectStatus, ProjectSummary, Storyboard } from "./schema";

export function dataDir(): string {
  // Runtime-configured folder; tell the bundler not to trace it.
  const dir = path.resolve(/*turbopackIgnore: true*/ process.cwd(), process.env.LFI_DATA_DIR || "./data");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

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
  };
}

export function createProject(input: {
  batchId: string;
  aspectRatio: Project["aspectRatio"];
  targetSeconds: 60 | 90;
  sourceText: string;
  storyboard: Storyboard;
  demo: boolean;
}): Project {
  const now = new Date().toISOString();
  const id = randomUUID();
  db()
    .prepare(
      `INSERT INTO projects (id, batch_id, created_at, updated_at, status, language,
         aspect_ratio, target_seconds, source_text, storyboard, approved_at, demo)
       VALUES (?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, NULL, ?)`,
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
    );
  return getProject(id)!;
}

export function getProject(id: string): Project | null {
  const row = db().prepare(`SELECT * FROM projects WHERE id = ?`).get(id) as
    | ProjectRow
    | undefined;
  return row ? toProject(row) : null;
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
             updated_at = ?, status = 'draft', approved_at = NULL
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

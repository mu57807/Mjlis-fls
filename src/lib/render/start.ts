import "server-only";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { dataDir } from "../storage";
import { failRender, setRenderPid } from "../db";

/**
 * Start the render worker in its own process. Its output goes to
 * data/logs/render-<id>.log, which is the place to look if a render fails.
 */
export function startRenderWorker(projectId: string) {
  const root = process.cwd();
  const tsxCli = path.join(/*turbopackIgnore: true*/ root, "node_modules", "tsx", "dist", "cli.mjs");
  const worker = path.join(/*turbopackIgnore: true*/ root, "scripts", "render-worker.mts");
  const logDir = path.join(dataDir(), "logs");
  fs.mkdirSync(logDir, { recursive: true });
  const logFd = fs.openSync(path.join(logDir, `render-${projectId}.log`), "a");

  const child = spawn(process.execPath, [tsxCli, worker, projectId], {
    cwd: root,
    env: process.env,
    detached: true,
    stdio: ["ignore", logFd, logFd],
  });
  child.on("error", (err) => failRender(projectId, `Could not start the render: ${err.message}`));
  if (child.pid) setRenderPid(projectId, child.pid);
  child.unref();
  fs.closeSync(logFd);
}

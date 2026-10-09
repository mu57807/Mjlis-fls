import { listProjects } from "@/lib/db";

// GET /api/projects - history list, newest first.
export async function GET() {
  return Response.json({ projects: listProjects() });
}

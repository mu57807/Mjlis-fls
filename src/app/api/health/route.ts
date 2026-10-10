import { connection } from "next/server";

// GET /api/health - used by the hosting platform to check the app is running.
export async function GET() {
  await connection();
  return Response.json({ ok: true });
}

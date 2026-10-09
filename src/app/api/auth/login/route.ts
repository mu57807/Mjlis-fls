import { cookies } from "next/headers";
import { SESSION_COOKIE, SESSION_DAYS, checkPassword, createSessionToken, passwordConfigured } from "@/lib/auth";

// POST /api/auth/login  { password }
export async function POST(request: Request) {
  if (!passwordConfigured()) {
    return Response.json({ error: "No password is set (LFI_ADMIN_PASSWORD)." }, { status: 400 });
  }
  const body = (await request.json().catch(() => null)) as { password?: unknown } | null;
  if (typeof body?.password !== "string" || !checkPassword(body.password)) {
    // Slow down password guessing.
    await new Promise((r) => setTimeout(r, 800));
    return Response.json({ error: "Wrong password." }, { status: 401 });
  }
  const secure =
    request.headers.get("x-forwarded-proto") === "https" || new URL(request.url).protocol === "https:";
  (await cookies()).set(SESSION_COOKIE, createSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: SESSION_DAYS * 24 * 3600,
  });
  return Response.json({ ok: true });
}

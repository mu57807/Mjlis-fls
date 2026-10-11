import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, isValidSession, passwordConfigured } from "@/lib/auth";

// Endpoints that check their own credentials (signature, API key or signed link).
const PUBLIC_PREFIXES = ["/login", "/api/auth/", "/api/whatsapp/", "/api/v1/", "/api/share/", "/api/health"];

const LOOPBACK = new Set(["localhost", "127.0.0.1", "::1", "[::1]", "::ffff:127.0.0.1"]);

/** True only for a browser on this same computer (not via a tunnel or the network). */
function isLocalRequest(req: NextRequest): boolean {
  const host = (req.headers.get("host") ?? "").replace(/:\d+$/, "");
  const forwarded = (req.headers.get("x-forwarded-for") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return LOOPBACK.has(host) && forwarded.every((ip) => LOOPBACK.has(ip));
}

export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p))) return NextResponse.next();

  if (!passwordConfigured()) {
    if (isLocalRequest(req)) return NextResponse.next();
    return new NextResponse(
      "LFI Video Studio is locked: no password is set yet.\n\nOn Railway or another hosting service: add the variable LFI_ADMIN_PASSWORD in the service settings (Variables) and redeploy.\nOn your own computer: add LFI_ADMIN_PASSWORD to .env.local and restart the app.",
      { status: 403, headers: { "Content-Type": "text/plain; charset=utf-8" } },
    );
  }

  if (isValidSession(req.cookies.get(SESSION_COOKIE)?.value)) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Please log in again." }, { status: 401 });
  }
  const login = new URL("/login", req.url);
  login.searchParams.set("next", pathname + search);
  return NextResponse.redirect(login);
}

export const config = {
  // Everything except static files.
  matcher: ["/((?!_next/static|_next/image|fonts/|brand/|icon.svg|favicon.ico).*)"],
};

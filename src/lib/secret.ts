// Signing of login cookies and share links. The key comes from LFI_SECRET, or
// is generated once and kept in data/secret.key (keep that file private).
import fs from "node:fs";
import path from "node:path";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { dataDir } from "./storage";

let cached: string | null = null;

export function getSecret(): string {
  if (cached) return cached;
  if (process.env.LFI_SECRET) return (cached = process.env.LFI_SECRET);
  const file = path.join(dataDir(), "secret.key");
  try {
    fs.writeFileSync(file, randomBytes(32).toString("hex"), { flag: "wx", mode: 0o600 });
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
  }
  return (cached = fs.readFileSync(file, "utf8").trim());
}

export function hmac(data: string, key = getSecret()): string {
  return createHmac("sha256", key).update(data).digest("base64url");
}

export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** A tamper-proof token carrying `payload` until `ttlSeconds` from now. */
export function signToken(payload: Record<string, unknown>, ttlSeconds: number): string {
  const body = Buffer.from(
    JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + ttlSeconds }),
  ).toString("base64url");
  return `${body}.${hmac(body)}`;
}

export function verifyToken<T extends Record<string, unknown>>(token: string | undefined | null): T | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig || !safeEqual(sig, hmac(body))) return null;
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString()) as T & { exp: number };
    return data.exp > Date.now() / 1000 ? data : null;
  } catch {
    return null;
  }
}

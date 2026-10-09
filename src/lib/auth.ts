// Web login: one shared password (LFI_ADMIN_PASSWORD) for HSE reviewers.
// Without a password the app only answers requests made on this computer.
import { createHash } from "node:crypto";
import { safeEqual, signToken, verifyToken } from "./secret";

export const SESSION_COOKIE = "lfi_session";
export const SESSION_DAYS = 7;

export function passwordConfigured(): boolean {
  return Boolean(process.env.LFI_ADMIN_PASSWORD);
}

export function checkPassword(input: string): boolean {
  const expected = process.env.LFI_ADMIN_PASSWORD;
  if (!expected) return false;
  // Compare hashes so the comparison takes the same time for any input length.
  const h = (s: string) => createHash("sha256").update(s).digest("hex");
  return safeEqual(h(input), h(expected));
}

export function createSessionToken(): string {
  return signToken({ u: "reviewer" }, SESSION_DAYS * 24 * 3600);
}

export function isValidSession(token: string | undefined): boolean {
  return verifyToken(token) !== null;
}

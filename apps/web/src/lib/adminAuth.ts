import argon2 from "argon2";
import { createHmac, timingSafeEqual } from "node:crypto";
import { loadEnv } from "@apex/config";

const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
export const ADMIN_SESSION_COOKIE = "apex_admin_session";

/**
 * Spec Section 1: "Dashboard: Next.js, password-protected behind
 * Argon2id auth + rate limiting, TLS only." This covers Argon2id
 * password hashing and a signed session cookie with per-IP rate
 * limiting on login attempts (see /api/admin/login). It does NOT cover
 * 2FA (not implemented) or TLS termination (an infra-layer concern —
 * this app needs to sit behind a TLS-terminating reverse proxy in
 * production, not something Next.js enforces on its own). Both are
 * real gaps that should be closed before this touches a real admin
 * password.
 */
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id });
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  return argon2.verify(hash, password);
}

function sign(expiresAtMs: number): string {
  const env = loadEnv();
  if (!env.AUTH_SECRET) throw new Error("AUTH_SECRET is not set — cannot sign admin sessions.");
  return createHmac("sha256", env.AUTH_SECRET).update(`admin.${expiresAtMs}`).digest("hex");
}

export function createAdminSessionToken(): string {
  const expiresAtMs = Date.now() + SESSION_TTL_MS;
  return `${expiresAtMs}.${sign(expiresAtMs)}`;
}

export function verifyAdminSessionToken(token: string | undefined): boolean {
  if (!token) return false;
  const [expStr, sig] = token.split(".");
  const expiresAtMs = Number(expStr);
  if (!expiresAtMs || !sig || expiresAtMs < Date.now()) return false;

  const expected = sign(expiresAtMs);
  const expectedBuf = Buffer.from(expected, "hex");
  const actualBuf = Buffer.from(sig, "hex");
  if (expectedBuf.length !== actualBuf.length) return false;
  return timingSafeEqual(expectedBuf, actualBuf);
}

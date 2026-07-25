import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "viralhive_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function getSessionSecret(): string {
  const secret = process.env.VIRALHIVE_SESSION_SECRET || process.env.VIRALHIVE_ENCRYPTION_KEY;
  if (!secret) {
    throw new Error("VIRALHIVE_SESSION_SECRET (or VIRALHIVE_ENCRYPTION_KEY) must be set to gate the dashboard.");
  }
  return secret;
}

function sign(payload: string): string {
  return createHmac("sha256", getSessionSecret()).update(payload).digest("base64url");
}

export function createSessionToken(): string {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const payload = String(expiresAt);
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string | undefined): boolean {
  if (!token) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  return Number(payload) > Date.now();
}

export function checkAdminPassword(candidate: string): boolean {
  const expected = process.env.VIRALHIVE_ADMIN_PASSWORD;
  if (!expected) {
    throw new Error("VIRALHIVE_ADMIN_PASSWORD is not set. Set it in your environment before logging in.");
  }
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

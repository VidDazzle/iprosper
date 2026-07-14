/**
 * Client-portal authentication primitives. Server-only.
 *
 * - Passwords: scrypt with a per-user random salt. Plaintext is never stored.
 * - Sessions: a compact HMAC-signed token (payload.signature) kept in an
 *   httpOnly cookie. No session table needed; tampering invalidates the token.
 *
 * SESSION_SECRET must be set in production. A dev fallback keeps local builds
 * working but is NOT secure — the app warns if the fallback is used.
 */

import crypto from "crypto";
import { promisify } from "util";

const scrypt = promisify(crypto.scrypt) as (p: string, s: string, k: number) => Promise<Buffer>;

const SECRET =
  process.env.SESSION_SECRET ||
  (process.env.NODE_ENV !== "production" ? "dev-insecure-secret-change-me" : "");

export const SESSION_COOKIE = "solvana_portal";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 14; // 14 days

/* ------------------------------- passwords -------------------------------- */

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, 64)).toString("hex");
  return `${salt}:${derived}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  const hashBuf = Buffer.from(hash, "hex");
  return hashBuf.length === derived.length && crypto.timingSafeEqual(hashBuf, derived);
}

/* -------------------------------- sessions -------------------------------- */

export interface SessionData {
  uid: number | string; // client_user id (or "demo")
  cid: string; // ops client id (e.g. SOLV-10248)
  name: string;
  email: string;
  demo?: boolean;
  exp: number; // unix seconds
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function sign(payloadB64: string): string {
  return crypto.createHmac("sha256", SECRET).update(payloadB64).digest("base64url");
}

export function createSessionToken(data: Omit<SessionData, "exp">): string {
  const payload: SessionData = { ...data, exp: Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS };
  const payloadB64 = b64url(JSON.stringify(payload));
  return `${payloadB64}.${sign(payloadB64)}`;
}

export function verifySessionToken(token: string | undefined): SessionData | null {
  if (!token || !SECRET) return null;
  const [payloadB64, sig] = token.split(".");
  if (!payloadB64 || !sig) return null;
  const expected = sign(payloadB64);
  if (
    expected.length !== sig.length ||
    !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))
  )
    return null;
  try {
    const data = JSON.parse(Buffer.from(payloadB64, "base64url").toString()) as SessionData;
    if (data.exp < Math.floor(Date.now() / 1000)) return null;
    return data;
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: MAX_AGE_SECONDS,
};

/* -------------------- one-click approval token (email/SMS) ---------------- */

export function createApprovalToken(approvalId: number | string, decision: "approve" | "reject"): string {
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7; // 7 days
  const payload = b64url(JSON.stringify({ aid: approvalId, decision, exp }));
  return `${payload}.${sign(payload)}`;
}

export function verifyApprovalToken(
  token: string
): { aid: string; decision: "approve" | "reject" } | null {
  const [payload, sig] = (token || "").split(".");
  if (!payload || !sig) return null;
  const expected = sign(payload);
  if (expected.length !== sig.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig)))
    return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (data.exp < Math.floor(Date.now() / 1000)) return null;
    return { aid: String(data.aid), decision: data.decision };
  } catch {
    return null;
  }
}

export function isSecretConfigured(): boolean {
  return Boolean(process.env.SESSION_SECRET);
}

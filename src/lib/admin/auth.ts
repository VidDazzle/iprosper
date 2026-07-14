/**
 * Admin (staff) authentication. Separate from the client portal: a distinct
 * cookie and a "staff" role, so a client session can never reach the admin
 * console and vice-versa.
 *
 * Staff credentials come from env (ADMIN_EMAIL + ADMIN_PASSWORD_HASH, the same
 * scrypt "salt:hash" format the portal uses). A dev-only fallback admin keeps
 * local builds usable; it is refused when NODE_ENV=production.
 */

import crypto from "crypto";
import { verifyPassword } from "@/lib/portal/auth";

const SECRET =
  process.env.SESSION_SECRET ||
  (process.env.NODE_ENV !== "production" ? "dev-insecure-secret-change-me" : "");

export const ADMIN_COOKIE = "solvana_admin";
const MAX_AGE_SECONDS = 60 * 60 * 8; // 8-hour staff session

// Dev-only fallback credentials (ignored in production).
const DEV_ADMIN_EMAIL = "admin@xdebt.ai";
const DEV_ADMIN_PASSWORD = "admin1234";

export interface AdminSession {
  email: string;
  role: "staff";
  exp: number;
}

function sign(payloadB64: string): string {
  return crypto.createHmac("sha256", SECRET).update(payloadB64).digest("base64url");
}

export function createAdminToken(email: string): string {
  const payload: AdminSession = { email, role: "staff", exp: Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${payloadB64}.${sign(payloadB64)}`;
}

export function verifyAdminToken(token: string | undefined): AdminSession | null {
  if (!token || !SECRET) return null;
  const [payloadB64, sig] = token.split(".");
  if (!payloadB64 || !sig) return null;
  const expected = sign(payloadB64);
  if (expected.length !== sig.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null;
  try {
    const data = JSON.parse(Buffer.from(payloadB64, "base64url").toString()) as AdminSession;
    if (data.role !== "staff" || data.exp < Math.floor(Date.now() / 1000)) return null;
    return data;
  } catch {
    return null;
  }
}

/** Verify staff credentials against env config (or the dev fallback). */
export async function verifyAdminCredentials(email: string, password: string): Promise<boolean> {
  const em = email.trim().toLowerCase();
  const envEmail = process.env.ADMIN_EMAIL?.toLowerCase();
  const envHash = process.env.ADMIN_PASSWORD_HASH;

  if (envEmail && envHash) {
    if (em !== envEmail) return false;
    return verifyPassword(password, envHash);
  }

  // Dev fallback only.
  if (process.env.NODE_ENV !== "production") {
    return em === DEV_ADMIN_EMAIL && password === DEV_ADMIN_PASSWORD;
  }
  return false;
}

export const adminCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: MAX_AGE_SECONDS,
};

export function adminAuthConfigured(): boolean {
  return Boolean(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD_HASH);
}

/**
 * Attorney dashboard authentication. Separate session from clients and staff:
 * distinct cookie + "attorney" role. Passwords are scrypt-hashed on the partner
 * record. Reuses the shared hashing from the portal.
 */

import crypto from "crypto";

const SECRET =
  process.env.SESSION_SECRET ||
  (process.env.NODE_ENV !== "production" ? "dev-insecure-secret-change-me" : "");

export const ATTORNEY_COOKIE = "xdebt_attorney";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 14; // 14 days

export interface AttorneySession {
  pid: number;
  email: string;
  firm: string;
  role: "attorney";
  exp: number;
}

function sign(payloadB64: string): string {
  return crypto.createHmac("sha256", SECRET).update(payloadB64).digest("base64url");
}

export function createAttorneyToken(data: Omit<AttorneySession, "exp" | "role">): string {
  const payload: AttorneySession = { ...data, role: "attorney", exp: Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS };
  const b64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${b64}.${sign(b64)}`;
}

export function verifyAttorneyToken(token: string | undefined): AttorneySession | null {
  if (!token || !SECRET) return null;
  const [b64, sig] = token.split(".");
  if (!b64 || !sig) return null;
  const expected = sign(b64);
  if (expected.length !== sig.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null;
  try {
    const data = JSON.parse(Buffer.from(b64, "base64url").toString()) as AttorneySession;
    if (data.role !== "attorney" || data.exp < Math.floor(Date.now() / 1000)) return null;
    return data;
  } catch {
    return null;
  }
}

export const attorneyCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: MAX_AGE_SECONDS,
};

/**
 * Signed proof-of-consent cookie. When a consumer signs the disclosure, we issue
 * an HMAC-signed token holding their typed name, the agreement version, and the
 * timestamp. Every analysis route verifies it before doing any work, so the gate
 * is enforced on the server, not just in the UI. Same dependency-free signing
 * approach as the session cookies.
 */

import crypto from "crypto";
import type { NextRequest } from "next/server";
import { AGREEMENT_VERSION } from "./agreement";

const SECRET =
  process.env.SESSION_SECRET ||
  (process.env.NODE_ENV !== "production" ? "dev-insecure-secret-change-me" : "");

export const CONSENT_COOKIE = "xdebt_consent";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 180; // 180 days

export interface ConsentToken {
  name: string;
  version: string;
  scope: string; // e.g. "advocate" — one signature covers the analysis tools
  iat: number;
  exp: number;
}

function sign(payloadB64: string): string {
  return crypto.createHmac("sha256", SECRET).update(payloadB64).digest("base64url");
}

export function createConsentToken(data: { name: string; scope: string }): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: ConsentToken = {
    name: data.name,
    version: AGREEMENT_VERSION,
    scope: data.scope,
    iat: now,
    exp: now + MAX_AGE_SECONDS,
  };
  const b64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${b64}.${sign(b64)}`;
}

export function verifyConsentToken(token: string | undefined): ConsentToken | null {
  if (!token || !SECRET) return null;
  const [b64, sig] = token.split(".");
  if (!b64 || !sig) return null;
  const expected = sign(b64);
  if (expected.length !== sig.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null;
  try {
    const data = JSON.parse(Buffer.from(b64, "base64url").toString()) as ConsentToken;
    if (data.exp < Math.floor(Date.now() / 1000)) return null;
    return data;
  } catch {
    return null;
  }
}

/** True only if a valid token exists AND it matches the CURRENT agreement version. */
export function consentIsCurrent(token: ConsentToken | null): boolean {
  return !!token && token.version === AGREEMENT_VERSION;
}

/** Read + verify the consent token off a NextRequest (for API-route gating). */
export function consentFromRequest(request: NextRequest): ConsentToken | null {
  return verifyConsentToken(request.cookies.get(CONSENT_COOKIE)?.value);
}

export const consentCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: MAX_AGE_SECONDS,
};

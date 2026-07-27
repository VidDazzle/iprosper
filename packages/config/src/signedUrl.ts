import { createHmac, timingSafeEqual } from "node:crypto";
import { loadEnv } from "./env.js";

export class MissingAuthSecretError extends Error {
  constructor() {
    super("AUTH_SECRET is not set — cannot sign or verify preview URLs. Refusing to fall back to a weak default.");
    this.name = "MissingAuthSecretError";
  }
}

function getSecret(): string {
  const env = loadEnv();
  if (!env.AUTH_SECRET) throw new MissingAuthSecretError();
  return env.AUTH_SECRET;
}

function sign(jobId: string, expiresAtMs: number): string {
  return createHmac("sha256", getSecret()).update(`${jobId}.${expiresAtMs}`).digest("hex");
}

/** 24h expiring, HMAC-signed preview URL (spec Section 4: signed/expiring preview URL). */
export function buildPreviewUrl(jobId: string, expiresAt: Date): string {
  const env = loadEnv();
  const expiresAtMs = expiresAt.getTime();
  const sig = sign(jobId, expiresAtMs);
  return `${env.PREVIEW_BASE_URL}/preview/${jobId}?exp=${expiresAtMs}&sig=${sig}`;
}

export function verifyPreviewSignature(jobId: string, expiresAtMs: number, sig: string): boolean {
  if (expiresAtMs < Date.now()) return false;
  const expected = sign(jobId, expiresAtMs);
  const expectedBuf = Buffer.from(expected, "hex");
  const actualBuf = Buffer.from(sig, "hex");
  if (expectedBuf.length !== actualBuf.length) return false;
  return timingSafeEqual(expectedBuf, actualBuf);
}

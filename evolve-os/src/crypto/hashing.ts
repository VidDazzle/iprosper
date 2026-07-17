import {
  createHash,
  createHmac,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { secureRandom } from "./random.js";

/** SHA-256 hex digest. */
export function sha256(data: Buffer | string): string {
  return createHash("sha256").update(data).digest("hex");
}

/** SHA-512 hex digest. */
export function sha512(data: Buffer | string): string {
  return createHash("sha512").update(data).digest("hex");
}

/** HMAC-SHA-256 hex digest. */
export function hmacSha256(key: Buffer | string, data: Buffer | string): string {
  return createHmac("sha256", key).update(data).digest("hex");
}

/**
 * Constant-time string comparison. Returns false on length mismatch without
 * leaking timing information about the compared content.
 */
export function constantTimeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) {
    // Still perform a comparison against a fixed buffer to reduce timing signal.
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

const SCRYPT_N = 1 << 15; // CPU/memory cost
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LEN = 64;

/**
 * Hash a secret (password / API secret) using scrypt with a random salt.
 * Format: `scrypt$N$r$p$<salt-b64>$<hash-b64>`.
 */
export function hashSecret(secret: string): string {
  const salt = secureRandom(16);
  const derived = scryptSync(secret, salt, KEY_LEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: 256 * 1024 * 1024,
  });
  return [
    "scrypt",
    SCRYPT_N,
    SCRYPT_R,
    SCRYPT_P,
    salt.toString("base64"),
    derived.toString("base64"),
  ].join("$");
}

/** Verify a secret against a stored scrypt hash in constant time. */
export function verifySecret(secret: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, nStr, rStr, pStr, saltB64, hashB64] = parts;
  const N = Number(nStr);
  const r = Number(rStr);
  const p = Number(pStr);
  if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p)) {
    return false;
  }
  const salt = Buffer.from(saltB64!, "base64");
  const expected = Buffer.from(hashB64!, "base64");
  const derived = scryptSync(secret, salt, expected.length, {
    N,
    r,
    p,
    maxmem: 256 * 1024 * 1024,
  });
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}

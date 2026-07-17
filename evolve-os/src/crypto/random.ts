import { randomBytes, randomUUID } from "node:crypto";

/** Cryptographically secure random bytes. */
export function secureRandom(bytes: number): Buffer {
  if (bytes <= 0 || bytes > 1 << 20) {
    throw new RangeError(`secureRandom: unreasonable byte count ${bytes}`);
  }
  return randomBytes(bytes);
}

/** URL-safe base64 token of `bytes` entropy (default 32 bytes = 256 bits). */
export function secureToken(bytes = 32): string {
  return secureRandom(bytes).toString("base64url");
}

/** RFC 4122 v4 UUID. */
export function uuid(): string {
  return randomUUID();
}

/** Prefixed, sortable-ish id: `<prefix>_<base64url(16 bytes)>`. */
export function prefixedId(prefix: string): string {
  return `${prefix}_${secureRandom(16).toString("base64url")}`;
}

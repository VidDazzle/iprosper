import { createCipheriv, createDecipheriv } from "node:crypto";
import { secureRandom } from "./random.js";

/**
 * Authenticated encryption with AES-256-GCM.
 *
 * Ciphertext envelope layout (all concatenated, then base64):
 *   [ 12-byte IV | 16-byte auth tag | ciphertext ]
 *
 * AES-256-GCM provides confidentiality + integrity (AEAD). Optional associated
 * data (AAD) binds the ciphertext to a context (e.g. a tenant id) so it cannot
 * be replayed in a different context without detection.
 */

const IV_LEN = 12;
const TAG_LEN = 16;
const KEY_LEN = 32; // 256-bit

export interface SealedBox {
  /** base64 of [iv | tag | ciphertext] */
  readonly ciphertext: string;
  /** algorithm marker for forward-compatibility */
  readonly alg: "AES-256-GCM";
}

export function assertKey(key: Buffer): void {
  if (key.length !== KEY_LEN) {
    throw new RangeError(`AEAD key must be ${KEY_LEN} bytes, got ${key.length}`);
  }
}

/** Encrypt `plaintext` with a 32-byte key. */
export function seal(
  key: Buffer,
  plaintext: Buffer | string,
  aad?: Buffer | string,
): SealedBox {
  assertKey(key);
  const iv = secureRandom(IV_LEN);
  const cipher = createCipheriv("aes-256-gcm", key, iv, {
    authTagLength: TAG_LEN,
  });
  if (aad !== undefined) {
    cipher.setAAD(Buffer.isBuffer(aad) ? aad : Buffer.from(aad, "utf8"));
  }
  const pt = Buffer.isBuffer(plaintext)
    ? plaintext
    : Buffer.from(plaintext, "utf8");
  const enc = Buffer.concat([cipher.update(pt), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    ciphertext: Buffer.concat([iv, tag, enc]).toString("base64"),
    alg: "AES-256-GCM",
  };
}

/** Decrypt a {@link SealedBox}. Throws if the auth tag or AAD does not verify. */
export function open(
  key: Buffer,
  box: SealedBox,
  aad?: Buffer | string,
): Buffer {
  assertKey(key);
  if (box.alg !== "AES-256-GCM") {
    throw new Error(`unsupported AEAD alg: ${box.alg}`);
  }
  const raw = Buffer.from(box.ciphertext, "base64");
  if (raw.length < IV_LEN + TAG_LEN) {
    throw new Error("ciphertext too short / corrupt");
  }
  const iv = raw.subarray(0, IV_LEN);
  const tag = raw.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const enc = raw.subarray(IV_LEN + TAG_LEN);
  const decipher = createDecipheriv("aes-256-gcm", key, iv, {
    authTagLength: TAG_LEN,
  });
  decipher.setAuthTag(tag);
  if (aad !== undefined) {
    decipher.setAAD(Buffer.isBuffer(aad) ? aad : Buffer.from(aad, "utf8"));
  }
  return Buffer.concat([decipher.update(enc), decipher.final()]);
}

/** Convenience: decrypt to a UTF-8 string. */
export function openString(
  key: Buffer,
  box: SealedBox,
  aad?: Buffer | string,
): string {
  return open(key, box, aad).toString("utf8");
}

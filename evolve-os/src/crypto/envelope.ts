import { seal, open, type SealedBox } from "./aead.js";
import type { Kms, WrappedKey } from "./kms.js";

/**
 * Envelope-encrypted record. The data key (DEK) that encrypted `data` is itself
 * stored encrypted (`wrappedKey`) under a KEK managed by the KMS. This is the
 * same pattern used by AWS KMS, GCP KMS, and every serious secrets store: bulk
 * data is encrypted locally with a fast symmetric DEK, and only the small DEK
 * is round-tripped through the KMS/HSM.
 */
export interface Envelope {
  readonly wrappedKey: WrappedKey;
  readonly data: SealedBox;
  readonly context?: string;
}

/** Encrypt arbitrary bytes/string with a fresh DEK, wrapping the DEK via KMS. */
export async function encryptEnvelope(
  kms: Kms,
  plaintext: Buffer | string,
  context?: string,
): Promise<Envelope> {
  const { plaintext: dek, wrapped } = await kms.generateDataKey(context);
  try {
    const data = seal(dek, plaintext, context);
    return context !== undefined
      ? { wrappedKey: wrapped, data, context }
      : { wrappedKey: wrapped, data };
  } finally {
    dek.fill(0); // best-effort zeroization of the plaintext DEK
  }
}

/** Decrypt an {@link Envelope}, unwrapping the DEK via KMS. */
export async function decryptEnvelope(
  kms: Kms,
  env: Envelope,
): Promise<Buffer> {
  const dek = await kms.unwrapKey(env.wrappedKey, env.context ?? "");
  try {
    return open(dek, env.data, env.context ?? "");
  } finally {
    dek.fill(0);
  }
}

/** Encrypt a JSON-serializable value into an envelope. */
export async function encryptJson<T>(
  kms: Kms,
  value: T,
  context?: string,
): Promise<Envelope> {
  return encryptEnvelope(kms, JSON.stringify(value), context);
}

/** Decrypt an envelope back into a JSON value. */
export async function decryptJson<T>(kms: Kms, env: Envelope): Promise<T> {
  const buf = await decryptEnvelope(kms, env);
  return JSON.parse(buf.toString("utf8")) as T;
}

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

/**
 * AES-256-GCM encryption for secrets stored in the DB (social account tokens,
 * provider API keys, Stripe key). The dashboard never stores raw secrets in
 * plaintext — only the ciphertext, decrypted server-side at the moment a
 * campaign actually runs.
 *
 * VIRALHIVE_ENCRYPTION_KEY must be set in the deployment environment. Losing
 * it means every stored secret needs to be re-entered — there is no recovery.
 */
function getKey(): Buffer {
  const secret = process.env.VIRALHIVE_ENCRYPTION_KEY;
  if (!secret) {
    throw new Error(
      "VIRALHIVE_ENCRYPTION_KEY is not set. Generate one (e.g. `openssl rand -base64 32`) and add it to your environment before storing any credentials."
    );
  }
  return scryptSync(secret, "viralhive-static-salt", 32);
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("base64"), authTag.toString("base64"), ciphertext.toString("base64")].join(".");
}

export function decryptSecret(encoded: string): string {
  const [ivB64, tagB64, ciphertextB64] = encoded.split(".");
  if (!ivB64 || !tagB64 || !ciphertextB64) throw new Error("Malformed encrypted value");
  const decipher = createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(ciphertextB64, "base64")), decipher.final()]);
  return plaintext.toString("utf8");
}

export function encryptJson(value: Record<string, string>): string {
  return encryptSecret(JSON.stringify(value));
}

export function decryptJson(encoded: string): Record<string, string> {
  if (encoded === "{}") return {};
  try {
    return JSON.parse(decryptSecret(encoded));
  } catch {
    return {};
  }
}

/** For rendering masked previews in the dashboard — never send real secrets back to the client. */
export function maskSecret(plaintext: string): string {
  if (plaintext.length <= 4) return "••••";
  return `${"•".repeat(Math.max(plaintext.length - 4, 4))}${plaintext.slice(-4)}`;
}

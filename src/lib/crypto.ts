import crypto from 'node:crypto';

/**
 * Symmetric encryption at rest for the mailbox.
 *
 * Every stored subject/body is encrypted with AES-256-GCM using a key derived
 * from MAIL_ENCRYPTION_KEY. Only ciphertext + IV + auth tag land in the
 * database, so a database dump leaks nothing readable. The auth tag makes the
 * scheme authenticated: tampered ciphertext fails to decrypt instead of
 * returning garbage.
 *
 * MAIL_ENCRYPTION_KEY should be a 64-char hex string (32 bytes). Generate one
 * with:  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 *
 * Losing the key means losing the ability to read stored mail — that is the
 * point of encryption at rest, but back the key up somewhere safe.
 */

const ALGORITHM = 'aes-256-gcm';

function getKey(): Buffer {
  const raw = process.env.MAIL_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      'MAIL_ENCRYPTION_KEY is not set. Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
    );
  }
  // Accept either a 64-char hex key (preferred) or any passphrase (hashed to 32 bytes).
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    return Buffer.from(raw, 'hex');
  }
  return crypto.createHash('sha256').update(raw).digest();
}

export interface EncryptedPayload {
  iv: string;
  tag: string;
  data: string;
}

/** Encrypt a UTF-8 string into a self-contained JSON envelope. */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(12); // 96-bit nonce recommended for GCM
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  const payload: EncryptedPayload = {
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    data: encrypted.toString('base64'),
  };
  return JSON.stringify(payload);
}

/** Decrypt a JSON envelope produced by encrypt(). Throws if tampered. */
export function decrypt(envelope: string): string {
  const key = getKey();
  const { iv, tag, data } = JSON.parse(envelope) as EncryptedPayload;
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(data, 'base64')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

/** Best-effort decrypt that never throws — returns a placeholder on failure. */
export function tryDecrypt(envelope: string | null | undefined, fallback = '[unable to decrypt]'): string {
  if (!envelope) return '';
  try {
    return decrypt(envelope);
  } catch {
    return fallback;
  }
}

/** True when a usable encryption key is configured. */
export function encryptionConfigured(): boolean {
  return Boolean(process.env.MAIL_ENCRYPTION_KEY);
}

/** Short, non-sensitive snippet for list views and voice previews. */
export function makePreview(body: string, max = 140): string {
  const collapsed = body.replace(/\s+/g, ' ').trim();
  return collapsed.length > max ? `${collapsed.slice(0, max - 1)}…` : collapsed;
}

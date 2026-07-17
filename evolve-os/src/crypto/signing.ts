import {
  generateKeyPairSync,
  sign as edSign,
  verify as edVerify,
  createPublicKey,
  createPrivateKey,
  type KeyObject,
} from "node:crypto";

/**
 * Ed25519 digital signatures — used for capability tokens, agent identity, and
 * tamper-evident audit anchoring. Ed25519 is fast, deterministic, and immune to
 * the nonce-reuse footguns of ECDSA.
 */
export interface SigningKeyPair {
  readonly publicKeyPem: string;
  readonly privateKeyPem: string;
}

export function generateSigningKeyPair(): SigningKeyPair {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  return {
    publicKeyPem: publicKey.export({ type: "spki", format: "pem" }).toString(),
    privateKeyPem: privateKey
      .export({ type: "pkcs8", format: "pem" })
      .toString(),
  };
}

function toPrivateKey(pem: string): KeyObject {
  return createPrivateKey(pem);
}
function toPublicKey(pem: string): KeyObject {
  return createPublicKey(pem);
}

/** Sign a message, returning a base64url signature. */
export function signMessage(privateKeyPem: string, message: Buffer | string): string {
  const msg = Buffer.isBuffer(message) ? message : Buffer.from(message, "utf8");
  // For Ed25519 the algorithm argument must be null.
  return edSign(null, msg, toPrivateKey(privateKeyPem)).toString("base64url");
}

/** Verify a base64url signature over a message. */
export function verifyMessage(
  publicKeyPem: string,
  message: Buffer | string,
  signatureB64Url: string,
): boolean {
  const msg = Buffer.isBuffer(message) ? message : Buffer.from(message, "utf8");
  try {
    return edVerify(
      null,
      msg,
      toPublicKey(publicKeyPem),
      Buffer.from(signatureB64Url, "base64url"),
    );
  } catch {
    return false;
  }
}

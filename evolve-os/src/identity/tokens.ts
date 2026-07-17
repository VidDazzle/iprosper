import { signMessage, verifyMessage } from "../crypto/signing.js";
import { constantTimeEqual } from "../crypto/hashing.js";

/**
 * Compact, signed capability tokens (JWS-like, Ed25519 / "EdDSA").
 *
 * Layout: `<b64url(header)>.<b64url(payload)>.<b64url(sig)>` where the signature
 * covers `header.payload`. Unlike opaque session cookies these are stateless
 * and verifiable by any service holding the public key — the basis for the
 * zero-trust gateway. Tokens carry an explicit, minimal capability set so a
 * compromised agent token cannot exceed what it was granted.
 */
export interface TokenClaims {
  /** Subject — the principal id. */
  sub: string;
  /** Tenant id. */
  tid: string;
  /** Principal kind. */
  knd: string;
  /** Granted capabilities (permission strings) — least privilege. */
  cap: string[];
  /** Issued-at (epoch seconds). */
  iat: number;
  /** Expiry (epoch seconds). */
  exp: number;
  /** Token id (for revocation lists). */
  jti: string;
  /** Optional audience (which service may accept it). */
  aud?: string;
}

interface Header {
  alg: "EdDSA";
  typ: "EVT"; // Evolve Verifiable Token
  kid: string; // key id of the signing key
}

function b64urlJson(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj), "utf8").toString("base64url");
}

export interface TokenIssuer {
  keyId: string;
  privateKeyPem: string;
}

export function issueToken(issuer: TokenIssuer, claims: TokenClaims): string {
  const header: Header = { alg: "EdDSA", typ: "EVT", kid: issuer.keyId };
  const signingInput = `${b64urlJson(header)}.${b64urlJson(claims)}`;
  const sig = signMessage(issuer.privateKeyPem, signingInput);
  return `${signingInput}.${sig}`;
}

export type VerifyResult =
  | { ok: true; claims: TokenClaims }
  | { ok: false; reason: string };

export interface VerifyOptions {
  /** Map of key id -> public key PEM (supports key rotation). */
  publicKeys: Record<string, string>;
  /** If set, token `aud` must equal this value. */
  audience?: string;
  /** Set of revoked token ids (jti). */
  revoked?: Set<string>;
  /** Clock skew tolerance in seconds. */
  clockSkewSec?: number;
  now?: () => number;
}

export function verifyToken(token: string, opts: VerifyOptions): VerifyResult {
  const parts = token.split(".");
  if (parts.length !== 3) return { ok: false, reason: "malformed token" };
  const [headerB64, payloadB64, sig] = parts as [string, string, string];

  let header: Header;
  let claims: TokenClaims;
  try {
    header = JSON.parse(Buffer.from(headerB64, "base64url").toString("utf8"));
    claims = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
  } catch {
    return { ok: false, reason: "undecodable token" };
  }

  if (header.alg !== "EdDSA" || header.typ !== "EVT") {
    return { ok: false, reason: "unsupported token type" };
  }
  const pub = opts.publicKeys[header.kid];
  if (!pub) return { ok: false, reason: `unknown key id: ${header.kid}` };

  const signingInput = `${headerB64}.${payloadB64}`;
  if (!verifyMessage(pub, signingInput, sig)) {
    return { ok: false, reason: "bad signature" };
  }

  const now = Math.floor((opts.now?.() ?? Date.now()) / 1000);
  const skew = opts.clockSkewSec ?? 30;
  if (claims.exp + skew < now) return { ok: false, reason: "expired" };
  if (claims.iat - skew > now) return { ok: false, reason: "issued in future" };

  if (opts.audience !== undefined) {
    if (claims.aud === undefined || !constantTimeEqual(claims.aud, opts.audience)) {
      return { ok: false, reason: "audience mismatch" };
    }
  }
  if (opts.revoked?.has(claims.jti)) {
    return { ok: false, reason: "revoked" };
  }
  return { ok: true, claims };
}

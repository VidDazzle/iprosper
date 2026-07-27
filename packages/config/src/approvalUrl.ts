import { createHmac, timingSafeEqual } from "node:crypto";
import { loadEnv } from "./env.js";
import { MissingAuthSecretError } from "./signedUrl.js";

export type ApprovalAction = "approve" | "reject";

function getSecret(): string {
  const env = loadEnv();
  if (!env.AUTH_SECRET) throw new MissingAuthSecretError();
  return env.AUTH_SECRET;
}

function sign(candidateId: string, action: ApprovalAction, expiresAtMs: number): string {
  return createHmac("sha256", getSecret()).update(`${candidateId}.${action}.${expiresAtMs}`).digest("hex");
}

/**
 * One-click, no-login approval link for a Scout candidate that needs
 * human sign-off — same trust model as buildPreviewUrl: the HMAC
 * signature IS the auth, not a session. Lets an approval be delivered
 * by SMS/email and acted on in a single tap, since a text message
 * can't collect a typed-in dollar figure — the amount is stated in
 * the message itself and the link commits to it (see
 * packages/scout/autonomousApproval.ts).
 */
export function buildApprovalUrl(candidateId: string, action: ApprovalAction, expiresAt: Date): string {
  const env = loadEnv();
  const expiresAtMs = expiresAt.getTime();
  const sig = sign(candidateId, action, expiresAtMs);
  return `${env.PREVIEW_BASE_URL}/api/approvals/opportunities/${candidateId}/${action}?exp=${expiresAtMs}&sig=${sig}`;
}

export function verifyApprovalSignature(
  candidateId: string,
  action: ApprovalAction,
  expiresAtMs: number,
  sig: string,
): boolean {
  if (expiresAtMs < Date.now()) return false;
  const expected = sign(candidateId, action, expiresAtMs);
  const expectedBuf = Buffer.from(expected, "hex");
  const actualBuf = Buffer.from(sig, "hex");
  if (expectedBuf.length !== actualBuf.length) return false;
  return timingSafeEqual(expectedBuf, actualBuf);
}

import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Generic HMAC-SHA256 webhook signature verification, used by the
 * invoicing and affiliate-network webhook endpoints — neither has a
 * real provider chosen yet (spec Section 8 doesn't name one), so this
 * assumes the common convention of a hex-encoded HMAC-SHA256 over the
 * raw request body. Re-check this against whatever real provider gets
 * picked; not every provider uses this exact scheme.
 */
export function verifyGenericHmac(rawBody: string, signatureHex: string, secret: string): boolean {
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const expectedBuf = Buffer.from(expected, "hex");
  let actualBuf: Buffer;
  try {
    actualBuf = Buffer.from(signatureHex, "hex");
  } catch {
    return false;
  }
  if (expectedBuf.length !== actualBuf.length) return false;
  return timingSafeEqual(expectedBuf, actualBuf);
}

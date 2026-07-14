import { describe, it, expect } from "vitest";
import { createConsentToken, verifyConsentToken, consentIsCurrent } from "./auth";
import { allAcksAccepted, REQUIRED_ACK_IDS, AGREEMENT_VERSION } from "./agreement";

describe("consent token (HMAC)", () => {
  it("round-trips a valid token", () => {
    const token = createConsentToken({ name: "Jane Q. Consumer", scope: "advocate" });
    const payload = verifyConsentToken(token);
    expect(payload).not.toBeNull();
    expect(payload!.name).toBe("Jane Q. Consumer");
    expect(payload!.version).toBe(AGREEMENT_VERSION);
    expect(consentIsCurrent(payload)).toBe(true);
  });

  it("rejects a tampered token", () => {
    const token = createConsentToken({ name: "Jane", scope: "advocate" });
    const [b64] = token.split(".");
    expect(verifyConsentToken(`${b64}.deadbeef`)).toBeNull();
    expect(verifyConsentToken("garbage")).toBeNull();
    expect(verifyConsentToken(undefined)).toBeNull();
  });

  it("treats a wrong-version token as not current", () => {
    // A syntactically valid token whose version won't match the current one.
    const now = Math.floor(Date.now() / 1000);
    const stale = { name: "X", version: "1999-01-01", scope: "advocate", iat: now, exp: now + 1000 };
    // Can't re-sign without the secret helper, so just assert consentIsCurrent's contract:
    expect(consentIsCurrent(stale)).toBe(false);
    expect(consentIsCurrent(null)).toBe(false);
  });
});

describe("required acknowledgments", () => {
  it("requires every ack id", () => {
    expect(allAcksAccepted(REQUIRED_ACK_IDS)).toBe(true);
    expect(allAcksAccepted(REQUIRED_ACK_IDS.slice(1))).toBe(false);
    expect(allAcksAccepted([])).toBe(false);
    expect(allAcksAccepted("not-an-array")).toBe(false);
  });
});

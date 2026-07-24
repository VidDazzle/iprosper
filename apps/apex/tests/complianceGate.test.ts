import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@apex/db";
import {
  runComplianceGate,
  ComplianceGateBlockedError,
  scanForPii,
  checkFtcDisclosure,
  checkPlatformToS,
} from "@apex/audit";
import { resetDb, teardown } from "./helpers.js";

beforeEach(resetDb);
afterAll(teardown);

describe("scanForPii", () => {
  it("finds emails and phone numbers", () => {
    const matches = scanForPii("Contact john.doe@example.com or call 555-123-4567.");
    expect(matches.some((m) => m.type === "email")).toBe(true);
    expect(matches.some((m) => m.type === "phone")).toBe(true);
  });

  it("respects the allowlist for known-public business contact info", () => {
    const matches = scanForPii("Reach us at hello@business.com", {
      allowlist: ["hello@business.com"],
    });
    expect(matches).toHaveLength(0);
  });
});

describe("checkFtcDisclosure", () => {
  it("fails content with no disclosure marker", () => {
    expect(checkFtcDisclosure("Check out this amazing product!").passed).toBe(false);
  });

  it("passes content with a recognized marker", () => {
    expect(checkFtcDisclosure("Check out this product #ad").passed).toBe(true);
  });
});

describe("checkPlatformToS", () => {
  it("fails closed for an unregistered network", () => {
    const result = checkPlatformToS("myspace", "hello world");
    expect(result.passed).toBe(false);
  });

  it("flags banned phrases for a registered network", () => {
    const result = checkPlatformToS("tiktok", "This offers guaranteed results!");
    expect(result.passed).toBe(false);
    expect(result.violations).toContain("guaranteed results");
  });

  it("passes clean content on a registered network", () => {
    const result = checkPlatformToS("tiktok", "Check out our new service.");
    expect(result.passed).toBe(true);
  });
});

describe("runComplianceGate", () => {
  it("blocks (throws) an affiliate post with no disclosure and no network", async () => {
    await expect(
      runComplianceGate({ contentType: "affiliate-post", content: "Buy this now!" }),
    ).rejects.toBeInstanceOf(ComplianceGateBlockedError);
  });

  it("passes a compliant affiliate post", async () => {
    const outcomes = await runComplianceGate({
      contentType: "affiliate-post",
      content: "Buy this now! #ad",
      network: "tiktok",
    });
    expect(outcomes.every((o) => o.passed)).toBe(true);
  });

  it("blocks content leaking PII not on the allowlist", async () => {
    await expect(
      runComplianceGate({
        contentType: "rebrand-preview",
        content: "Contact the owner directly at personalcell@gmail.com",
      }),
    ).rejects.toBeInstanceOf(ComplianceGateBlockedError);
  });

  it("blocks a media asset with no matching license record", async () => {
    await expect(
      runComplianceGate({
        contentType: "media-asset",
        content: "no pii here",
        mediaLicenseIds: ["missing-license-id"],
      }),
    ).rejects.toBeInstanceOf(ComplianceGateBlockedError);
  });

  it("passes a media asset with a valid, non-expired, non-revoked license", async () => {
    await prisma.mediaLicense.create({
      data: {
        licenseId: "lic-123",
        assetUrl: "https://example.com/photo.jpg",
        source: "shutterstock",
        licenseType: "royalty-free",
      },
    });

    const outcomes = await runComplianceGate({
      contentType: "media-asset",
      content: "no pii here",
      mediaLicenseIds: ["lic-123"],
    });
    expect(outcomes.every((o) => o.passed)).toBe(true);
  });

  it("writes an audit log entry on every run, pass or fail", async () => {
    try {
      await runComplianceGate({ contentType: "affiliate-post", content: "no disclosure" });
    } catch {
      // expected to throw
    }
    await runComplianceGate({
      contentType: "affiliate-post",
      content: "clean #ad",
      network: "instagram",
    });

    const entries = await prisma.auditLog.findMany({ where: { action: "compliance_check_run" } });
    expect(entries.length).toBe(2);
  });
});

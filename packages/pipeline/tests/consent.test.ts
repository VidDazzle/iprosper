import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@apex/db";
import { getQueue, QUEUE_NAMES } from "@apex/queue";
import { revokeConsent, isConsentActive, startNurtureQueue, closerJobId, nurtureJobId } from "../src/index.js";
import { resetDb, teardown, createTestLead } from "./helpers.js";

beforeEach(resetDb);
afterAll(teardown);

describe("isConsentActive", () => {
  it("is true for an active lead with no revocation", () => {
    expect(isConsentActive({ status: "active", consentRevokedAt: null })).toBe(true);
  });
  it("is false once revoked or erased", () => {
    expect(isConsentActive({ status: "revoked", consentRevokedAt: new Date() })).toBe(false);
    expect(isConsentActive({ status: "erased", consentRevokedAt: null })).toBe(false);
  });
});

describe("revokeConsent", () => {
  it("marks the lead revoked and removes every pending Closer + nurture job for it", async () => {
    const { lead } = await createTestLead();
    await startNurtureQueue(lead.id);

    const closerQueue = getQueue(QUEUE_NAMES.closerDispatch);
    const nurtureQueue = getQueue(QUEUE_NAMES.nurtureDispatch);
    await closerQueue.add("touch", { leadId: lead.id, sequence: 2 }, { jobId: closerJobId(lead.id, 2), delay: 3600000 });

    await revokeConsent(lead.id, "test:revoke");

    const updated = await prisma.lead.findUniqueOrThrow({ where: { id: lead.id } });
    expect(updated.status).toBe("revoked");
    expect(updated.consentRevokedAt).not.toBeNull();

    expect(await closerQueue.getJob(closerJobId(lead.id, 2))).toBeUndefined();
    for (const day of [2, 5, 9, 13]) {
      expect(await nurtureQueue.getJob(nurtureJobId(lead.id, day))).toBeUndefined();
    }

    const auditEntries = await prisma.auditLog.findMany({ where: { action: "consent_revoked", target: lead.id } });
    expect(auditEntries).toHaveLength(1);
  });
});

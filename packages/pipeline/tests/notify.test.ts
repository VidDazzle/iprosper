import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@apex/db";
import { getQueue, QUEUE_NAMES } from "@apex/queue";
import { captureLead, MissingConsentError } from "../src/notify.js";
import { resetDb, teardown, createTestJob } from "./helpers.js";

beforeEach(resetDb);
afterAll(teardown);

describe("captureLead", () => {
  it("refuses to capture a lead without explicit consent text", async () => {
    const job = await createTestJob();
    await expect(
      captureLead({ jobId: job.id, name: "Jane", email: "jane@example.com", consentText: "" }),
    ).rejects.toBeInstanceOf(MissingConsentError);
  });

  it("writes a Lead row with a stored consent timestamp + text, links it to the job, and enqueues Closer + owner digest", async () => {
    const job = await createTestJob();
    const lead = await captureLead({
      jobId: job.id,
      name: "Jane Doe",
      email: "jane@example.com",
      phone: "555-1234",
      consentText: "I agree to be contacted about my rebrand preview.",
    });

    expect(lead.status).toBe("active");
    expect(lead.consentText).toBe("I agree to be contacted about my rebrand preview.");
    expect(lead.consentTimestamp).toBeInstanceOf(Date);

    const updatedJob = await prisma.dispatchJob.findUniqueOrThrow({ where: { id: job.id } });
    expect(updatedJob.leadId).toBe(lead.id);
    expect(updatedJob.stage).toBe("notify");

    const auditEntries = await prisma.auditLog.findMany({ where: { action: "lead_captured", target: lead.id } });
    expect(auditEntries).toHaveLength(1);

    const closerJobs = await getQueue(QUEUE_NAMES.closerDispatch).getJobs(["waiting", "delayed"]);
    expect(closerJobs.some((j) => j.data.leadId === lead.id)).toBe(true);

    const digestJobs = await getQueue(QUEUE_NAMES.ownerDigest).getJobs(["waiting", "delayed"]);
    expect(digestJobs.some((j) => j.data.leadId === lead.id)).toBe(true);
  });
});

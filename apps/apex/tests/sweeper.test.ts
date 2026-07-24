import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@apex/db";
import { getQueue, QUEUE_NAMES } from "@apex/queue";
import { sweepFailedJobs } from "@apex/dispatch";
import { dispatch } from "@apex/dispatch";
import { kill } from "../src/killSwitch.js";
import { resetDb, teardown } from "./helpers.js";

beforeEach(resetDb);
afterAll(teardown);

async function makeFailedJob(agentId = "sweeper-test-agent", retryCount = 0) {
  const job = await dispatch({
    agentId,
    engine: "client-acquisition",
    source: "rebrand-engine",
    task: { url: "https://example.com" },
    budgetCap: 10,
  });
  return prisma.dispatchJob.update({ where: { id: job.id }, data: { status: "failed", retryCount } });
}

describe("sweepFailedJobs", () => {
  it("retries a failed job under the max, incrementing retryCount and re-queueing it", async () => {
    const job = await makeFailedJob("agent-a", 0);

    const result = await sweepFailedJobs();
    expect(result.retried).toContain(job.id);

    const updated = await prisma.dispatchJob.findUniqueOrThrow({ where: { id: job.id } });
    expect(updated.status).toBe("queued");
    expect(updated.retryCount).toBe(1);

    const queuedJob = await getQueue(QUEUE_NAMES.apexDispatch).getJob(`${job.id}-retry1`);
    expect(queuedJob).toBeTruthy();

    const auditEntries = await prisma.auditLog.findMany({ where: { action: "sweeper_retry", target: job.id } });
    expect(auditEntries).toHaveLength(1);
  });

  it("escalates (does not retry) once retryCount reaches the max", async () => {
    const job = await makeFailedJob("agent-b", 3);

    const result = await sweepFailedJobs();
    expect(result.escalated).toContain(job.id);
    expect(result.retried).not.toContain(job.id);

    const updated = await prisma.dispatchJob.findUniqueOrThrow({ where: { id: job.id } });
    expect(updated.status).toBe("failed"); // left as failed, not re-queued

    const digestJobs = await getQueue(QUEUE_NAMES.ownerDigest).getJobs(["waiting"]);
    expect(digestJobs.some((j) => j.data.dispatchJobId === job.id)).toBe(true);
  });

  it("does not escalate the same maxed-out job twice across repeated sweeps", async () => {
    const job = await makeFailedJob("agent-c", 3);

    await sweepFailedJobs();
    const secondSweep = await sweepFailedJobs();

    expect(secondSweep.escalated).not.toContain(job.id);

    const auditEntries = await prisma.auditLog.findMany({ where: { action: "sweeper_escalated", target: job.id } });
    expect(auditEntries).toHaveLength(1); // not duplicated
  });

  it("does not retry a job whose agent has been killed", async () => {
    const job = await makeFailedJob("agent-d", 0);
    await kill("agent-d", "test kill");

    const result = await sweepFailedJobs();
    expect(result.retried).not.toContain(job.id);
    expect(result.escalated).not.toContain(job.id);

    const updated = await prisma.dispatchJob.findUniqueOrThrow({ where: { id: job.id } });
    // kill() only halts non-terminal (queued/running) jobs — this one was
    // already "failed" before the kill, so it stays failed, just never
    // retried or escalated by the sweeper from here on.
    expect(updated.status).toBe("failed");
  });
});

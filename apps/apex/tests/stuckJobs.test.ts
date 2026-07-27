import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@apex/db";
import { detectStuckJobs } from "@apex/dispatch";
import { dispatch } from "@apex/dispatch";
import { resetDb, teardown } from "./helpers.js";

beforeEach(resetDb);
afterAll(teardown);

async function makeJob(status: string, updatedAt: Date) {
  const job = await dispatch({
    agentId: "stuck-test-agent",
    engine: "client-acquisition",
    source: "rebrand-engine",
    task: {},
    budgetCap: 10,
  });
  return prisma.dispatchJob.update({ where: { id: job.id }, data: { status, updatedAt } });
}

describe("detectStuckJobs", () => {
  it("marks a job stuck in 'running' past the timeout as failed", async () => {
    const staleTime = new Date(Date.now() - 45 * 60 * 1000); // 45 min ago, default threshold is 30 min
    const job = await makeJob("running", staleTime);

    const flagged = await detectStuckJobs();
    expect(flagged).toContain(job.id);

    const updated = await prisma.dispatchJob.findUniqueOrThrow({ where: { id: job.id } });
    expect(updated.status).toBe("failed");
    expect(updated.inspectorVerdict).toMatchObject({ passed: false });

    const auditEntries = await prisma.auditLog.findMany({ where: { action: "stuck_job_marked_failed", target: job.id } });
    expect(auditEntries).toHaveLength(1);
  });

  it("leaves a recently-updated 'running' job alone", async () => {
    const job = await makeJob("running", new Date());
    const flagged = await detectStuckJobs();
    expect(flagged).not.toContain(job.id);

    const updated = await prisma.dispatchJob.findUniqueOrThrow({ where: { id: job.id } });
    expect(updated.status).toBe("running");
  });

  it("uses a longer timeout for 'queued' than 'running'", async () => {
    const fortyFiveMinAgo = new Date(Date.now() - 45 * 60 * 1000);
    const job = await makeJob("queued", fortyFiveMinAgo); // past running's 30min, under queued's 60min default

    const flagged = await detectStuckJobs();
    expect(flagged).not.toContain(job.id);
  });

  it("does not touch completed, killed, or already-failed jobs", async () => {
    const staleTime = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const completed = await makeJob("completed", staleTime);
    const killed = await makeJob("killed", staleTime);

    const flagged = await detectStuckJobs();
    expect(flagged).not.toContain(completed.id);
    expect(flagged).not.toContain(killed.id);
  });
});

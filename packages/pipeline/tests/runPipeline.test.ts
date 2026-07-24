import { describe, it, expect, beforeEach, beforeAll, afterAll } from "vitest";
import { prisma } from "@apex/db";
import { runPipeline } from "../src/runPipeline.js";
import { STAGE_COST } from "../src/costs.js";
import { resetDb, teardown, createTestJob } from "./helpers.js";
import { startFixtureServer } from "./fixtureServer.js";

let server: Awaited<ReturnType<typeof startFixtureServer>>;

beforeAll(async () => {
  server = await startFixtureServer();
});
afterAll(async () => {
  await server.close();
  await teardown();
});
beforeEach(resetDb);

describe("runPipeline", () => {
  it("runs scrape -> extract -> render -> voice end to end, staying under budget, and promotes progress toward trial", async () => {
    const job = await createTestJob({
      task: { url: server.url + "/", ip: "127.0.0.1", ts: new Date().toISOString() },
      budgetCap: 10,
    });

    const result = await runPipeline(job.id);
    if (result.skipped) throw new Error(`expected pipeline to run, got skipped: ${result.reason}`);

    expect(result.doneChecklist).toEqual({ scrape: true, extract: true, render: true, voice: true });
    expect(result.renderResult.templateKey).toBe("built"); // "Roof Repair" -> BUILT

    const updated = await prisma.dispatchJob.findUniqueOrThrow({ where: { id: job.id } });
    expect(updated.status).toBe("completed");
    expect(updated.stage).toBe("closed");
    expect(Number(updated.costToDate)).toBeCloseTo(
      STAGE_COST.scrape + STAGE_COST.extract + STAGE_COST.render + STAGE_COST.voice,
    );
    expect(updated.inspectorVerdict).toMatchObject({ passed: true });

    const outcome = await prisma.jobOutcome.findUniqueOrThrow({ where: { jobId: job.id } });
    expect(outcome.result).toMatchObject({ templateKey: "built" });

    const agent = await prisma.agent.findUniqueOrThrow({ where: { id: "test-rebrand-agent" } });
    expect(agent.trialRunsCompleted).toBe(1);
    expect(agent.status).toBe("trial"); // trialRunsRequired defaults to 3
  });

  it("stops mid-pipeline and marks failed when the budget cap can't cover remaining stages", async () => {
    const tooSmallCap = STAGE_COST.scrape + STAGE_COST.extract + 0.01; // not enough for render+voice
    const job = await createTestJob({
      task: { url: server.url + "/", ip: "127.0.0.1", ts: new Date().toISOString() },
      budgetCap: tooSmallCap,
    });

    await expect(runPipeline(job.id)).rejects.toThrow(/budget cap/i);

    const updated = await prisma.dispatchJob.findUniqueOrThrow({ where: { id: job.id } });
    expect(updated.status).toBe("failed");
    expect(updated.doneChecklist).toMatchObject({ scrape: true, extract: true, render: false, voice: false });
    expect(Number(updated.costToDate)).toBeLessThanOrEqual(tooSmallCap);
  });

  it("skips cleanly (does not throw) when the target URL is robots-disallowed", async () => {
    const job = await createTestJob({
      task: { url: server.url + "/private", ip: "127.0.0.1", ts: new Date().toISOString() },
    });

    const result = await runPipeline(job.id);
    expect(result.skipped).toBe(true);

    const updated = await prisma.dispatchJob.findUniqueOrThrow({ where: { id: job.id } });
    expect(updated.status).toBe("failed");
  });

  it("does nothing for an already-killed job", async () => {
    const job = await createTestJob();
    await prisma.dispatchJob.update({ where: { id: job.id }, data: { status: "killed" } });

    const result = await runPipeline(job.id);
    expect(result).toEqual({ skipped: true, reason: "job is killed" });
  });
});

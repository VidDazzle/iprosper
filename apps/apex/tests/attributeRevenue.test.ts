import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@apex/db";
import { attributeRevenue } from "@apex/spend";
import { resetDb, teardown } from "./helpers.js";

beforeEach(resetDb);
afterAll(teardown);

async function seedJob() {
  await prisma.agent.upsert({
    where: { id: "revenue-test-agent" },
    update: {},
    create: { id: "revenue-test-agent", engine: "evolve", status: "trial" },
  });
  return prisma.dispatchJob.create({
    data: {
      source: "evolve",
      engine: "evolve",
      agentId: "revenue-test-agent",
      task: {},
      budgetCap: 100,
      stage: "queued",
      status: "queued",
    },
  });
}

describe("attributeRevenue", () => {
  it("sets invoicePaid, invoicePaidAt, and revenueAttributed on first attribution", async () => {
    const job = await seedJob();
    const updated = await attributeRevenue(job.id, 250);

    expect(updated.invoicePaid).toBe(true);
    expect(updated.invoicePaidAt).not.toBeNull();
    expect(Number(updated.revenueAttributed)).toBe(250);

    const auditEntries = await prisma.auditLog.findMany({ where: { action: "revenue_attributed", target: job.id } });
    expect(auditEntries).toHaveLength(1);
  });

  it("never double-counts a second attribution attempt on the same job", async () => {
    const job = await seedJob();
    await attributeRevenue(job.id, 250);
    const secondAttempt = await attributeRevenue(job.id, 999);

    expect(Number(secondAttempt.revenueAttributed)).toBe(250); // unchanged, not 999 and not 1249

    const duplicateEntries = await prisma.auditLog.findMany({
      where: { action: "duplicate_revenue_attribution_ignored", target: job.id },
    });
    expect(duplicateEntries).toHaveLength(1);
  });

  it("rejects a negative amount", async () => {
    const job = await seedJob();
    await expect(attributeRevenue(job.id, -5)).rejects.toThrow(/non-negative/);
  });

  it("throws for a nonexistent job", async () => {
    await expect(attributeRevenue("nonexistent-id", 100)).rejects.toThrow(/not found/);
  });
});

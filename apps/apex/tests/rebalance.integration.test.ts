import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@apex/db";
import { runWeeklyRebalance } from "../src/rebalance.js";
import { resetDb, teardown } from "./helpers.js";

beforeEach(resetDb);
afterAll(teardown);

function mondayOf(d: Date): Date {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  date.setUTCDate(date.getUTCDate() - diff);
  return date;
}

describe("runWeeklyRebalance", () => {
  it("closes out last week's actuals and defaults to balanced with no history", async () => {
    const now = new Date();
    const thisWeekStart = mondayOf(now);
    const lastWeekStart = new Date(thisWeekStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    const midLastWeek = new Date(lastWeekStart.getTime() + 2 * 24 * 60 * 60 * 1000);

    await prisma.dispatchJob.create({
      data: {
        source: "rebrand-engine",
        engine: "client-acquisition",
        stage: "queued",
        agentId: "rebrand-engine",
        task: {},
        budgetCap: 100,
        costToDate: 10,
        revenueAttributed: 30,
        createdAt: midLastWeek,
      },
    });

    const result = await runWeeklyRebalance(now);
    expect(result.allocations).toHaveLength(3);
    expect(result.allocations.every((a) => a.status === "balanced")).toBe(true);

    const closedWeek = await prisma.engineWeek.findUniqueOrThrow({
      where: { engine_weekStart: { engine: "client-acquisition", weekStart: lastWeekStart } },
    });
    expect(Number(closedWeek.spend)).toBe(10);
    expect(Number(closedWeek.revenue)).toBe(30);
    expect(Number(closedWeek.roi)).toBeCloseTo(2); // (30-10)/10

    const auditEntries = await prisma.auditLog.findMany({ where: { action: "rebalance_applied" } });
    expect(auditEntries.length).toBe(1);
  });
});

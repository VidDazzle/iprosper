import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@apex/db";
import { computeLedger, computeLedgerWithZeroFill } from "../src/ledger.js";
import { resetDb, teardown } from "./helpers.js";

beforeEach(resetDb);
afterAll(teardown);

async function seedJob(engine: string, agentId: string, cost: number, revenue: number) {
  await prisma.dispatchJob.create({
    data: {
      source: "rebrand-engine",
      engine,
      stage: "queued",
      agentId,
      task: {},
      budgetCap: 1000,
      costToDate: cost,
      revenueAttributed: revenue,
    },
  });
}

describe("computeLedger", () => {
  it("sums spend/revenue/pnl per engine and per agent", async () => {
    await seedJob("client-acquisition", "rebrand-engine", 10, 25);
    await seedJob("client-acquisition", "rebrand-engine", 5, 0);
    await seedJob("client-acquisition", "closer-agent", 2, 0);
    await seedJob("affiliate", "affiliate-agent", 3, 40);

    const snapshot = await computeLedger();

    const clientEngine = snapshot.byEngine.find((e) => e.engine === "client-acquisition")!;
    expect(clientEngine.spend).toBe(17);
    expect(clientEngine.revenue).toBe(25);
    expect(clientEngine.pnl).toBe(8);
    expect(clientEngine.jobCount).toBe(3);

    const affiliateEngine = snapshot.byEngine.find((e) => e.engine === "affiliate")!;
    expect(affiliateEngine.pnl).toBe(37);

    const rebrandAgent = snapshot.byAgent.find((a) => a.agentId === "rebrand-engine")!;
    expect(rebrandAgent.spend).toBe(15);
    expect(rebrandAgent.revenue).toBe(25);

    const closerAgent = snapshot.byAgent.find((a) => a.agentId === "closer-agent")!;
    expect(closerAgent.spend).toBe(2);
    expect(closerAgent.revenue).toBe(0);
  });

  it("filters by engine when requested", async () => {
    await seedJob("client-acquisition", "a1", 1, 1);
    await seedJob("evolve", "a2", 2, 2);

    const snapshot = await computeLedger("evolve");
    expect(snapshot.byEngine.every((e) => e.engine === "evolve")).toBe(true);
    expect(snapshot.byAgent.every((a) => a.engine === "evolve")).toBe(true);
  });

  it("never counts unattributed revenue — only what's actually in revenueAttributed", async () => {
    await seedJob("evolve", "evolve-launch-1", 50, 0); // spend with no confirmed revenue yet

    const snapshot = await computeLedger("evolve");
    const row = snapshot.byEngine.find((e) => e.engine === "evolve")!;
    expect(row.revenue).toBe(0);
    expect(row.pnl).toBe(-50);
  });
});

describe("computeLedgerWithZeroFill", () => {
  it("includes zero-rows for engines with no jobs yet", async () => {
    await seedJob("affiliate", "a1", 1, 1);
    const snapshot = await computeLedgerWithZeroFill();
    const engines = snapshot.byEngine.map((e) => e.engine).sort();
    expect(engines).toEqual(["affiliate", "client-acquisition", "evolve"]);
  });
});

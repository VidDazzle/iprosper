import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@apex/db";
import { dispatch, recordCost, BudgetCapExceededError } from "../src/dispatch.js";
import { AgentKilledError } from "../src/agents.js";
import { kill } from "../src/killSwitch.js";
import { resetDb, teardown } from "./helpers.js";

beforeEach(resetDb);
afterAll(teardown);

describe("dispatch", () => {
  it("creates a DispatchJob and an Agent row", async () => {
    const job = await dispatch({
      agentId: "test-agent-1",
      engine: "client-acquisition",
      source: "rebrand-engine",
      task: { url: "https://example.com" },
      budgetCap: 5,
    });

    expect(job.status).toBe("queued");
    expect(Number(job.budgetCap)).toBe(5);

    const agent = await prisma.agent.findUnique({ where: { id: "test-agent-1" } });
    expect(agent?.status).toBe("active");
    expect(agent?.engine).toBe("client-acquisition");
  });

  it("refuses to dispatch to a killed agent", async () => {
    await dispatch({
      agentId: "test-agent-2",
      engine: "affiliate",
      source: "affiliate-agent",
      task: {},
      budgetCap: 5,
    });
    await kill("test-agent-2", "manual test kill");

    await expect(
      dispatch({
        agentId: "test-agent-2",
        engine: "affiliate",
        source: "affiliate-agent",
        task: {},
        budgetCap: 5,
      }),
    ).rejects.toBeInstanceOf(AgentKilledError);
  });
});

describe("recordCost (hard budget cap enforcement)", () => {
  it("accumulates cost under the cap", async () => {
    const job = await dispatch({
      agentId: "test-agent-3",
      engine: "evolve",
      source: "evolve",
      task: {},
      budgetCap: 10,
    });

    const updated = await recordCost(job.id, 4);
    expect(Number(updated.costToDate)).toBe(4);

    const updated2 = await recordCost(job.id, 6);
    expect(Number(updated2.costToDate)).toBe(10);
  });

  it("throws and never exceeds the hard cap", async () => {
    const job = await dispatch({
      agentId: "test-agent-4",
      engine: "evolve",
      source: "evolve",
      task: {},
      budgetCap: 10,
    });

    await recordCost(job.id, 8);
    await expect(recordCost(job.id, 5)).rejects.toBeInstanceOf(BudgetCapExceededError);

    const unchanged = await prisma.dispatchJob.findUniqueOrThrow({ where: { id: job.id } });
    expect(Number(unchanged.costToDate)).toBe(8); // not 13 — the overage was never applied
  });

  it("refuses to record cost against a killed job", async () => {
    const job = await dispatch({
      agentId: "test-agent-5",
      engine: "evolve",
      source: "evolve",
      task: {},
      budgetCap: 10,
    });
    await kill("test-agent-5", "manual test kill");

    await expect(recordCost(job.id, 1)).rejects.toThrow(/killed/);
  });
});

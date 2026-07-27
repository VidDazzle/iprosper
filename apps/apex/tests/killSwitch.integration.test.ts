import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@apex/db";
import { dispatch } from "../src/dispatch.js";
import { kill, checkAndFireKillSwitch, UnknownAgentError } from "../src/killSwitch.js";
import { resetDb, teardown } from "./helpers.js";

beforeEach(resetDb);
afterAll(teardown);

describe("kill", () => {
  it("halts every non-terminal job owned by the agent", async () => {
    const job1 = await dispatch({
      agentId: "halt-agent",
      engine: "client-acquisition",
      source: "rebrand-engine",
      task: {},
      budgetCap: 5,
    });
    const job2 = await dispatch({
      agentId: "halt-agent",
      engine: "client-acquisition",
      source: "rebrand-engine",
      task: {},
      budgetCap: 5,
    });
    // simulate one job already completed — must NOT be touched
    await prisma.dispatchJob.update({ where: { id: job2.id }, data: { status: "completed" } });

    const result = await kill("halt-agent", "test halt");
    expect(result.status).toBe("killed");

    const refreshed1 = await prisma.dispatchJob.findUniqueOrThrow({ where: { id: job1.id } });
    const refreshed2 = await prisma.dispatchJob.findUniqueOrThrow({ where: { id: job2.id } });
    expect(refreshed1.status).toBe("killed");
    expect(refreshed2.status).toBe("completed"); // untouched — was already terminal

    const agent = await prisma.agent.findUniqueOrThrow({ where: { id: "halt-agent" } });
    expect(agent.status).toBe("killed");
  });

  it("writes an audit log entry on every fire", async () => {
    await dispatch({
      agentId: "audit-agent",
      engine: "client-acquisition",
      source: "rebrand-engine",
      task: {},
      budgetCap: 5,
    });
    await kill("audit-agent", "test audit trail");

    const entries = await prisma.auditLog.findMany({ where: { target: "audit-agent" } });
    expect(entries.length).toBe(1);
    expect(entries[0].action).toBe("kill_switch_fired");
  });

  it("refuses to kill an agent that has never been dispatched", async () => {
    await expect(kill("nonexistent-agent", "test")).rejects.toBeInstanceOf(UnknownAgentError);
  });
});

describe("checkAndFireKillSwitch", () => {
  it("auto-fires for an agent whose 7-day spend exceeds revenue", async () => {
    await prisma.agent.create({ data: { id: "losing-agent", engine: "affiliate", status: "active" } });
    await prisma.dispatchJob.create({
      data: {
        source: "affiliate-agent",
        engine: "affiliate",
        stage: "queued",
        agentId: "losing-agent",
        task: {},
        budgetCap: 100,
        costToDate: 80,
        revenueAttributed: 20,
      },
    });

    const fired = await checkAndFireKillSwitch();
    expect(fired.map((f) => f.agentId)).toContain("losing-agent");

    const agent = await prisma.agent.findUniqueOrThrow({ where: { id: "losing-agent" } });
    expect(agent.status).toBe("killed");
  });

  it("does not fire for an agent whose revenue covers its spend", async () => {
    await prisma.agent.create({ data: { id: "winning-agent", engine: "affiliate", status: "active" } });
    await prisma.dispatchJob.create({
      data: {
        source: "affiliate-agent",
        engine: "affiliate",
        stage: "queued",
        agentId: "winning-agent",
        task: {},
        budgetCap: 100,
        costToDate: 20,
        revenueAttributed: 80,
      },
    });

    const fired = await checkAndFireKillSwitch();
    expect(fired.map((f) => f.agentId)).not.toContain("winning-agent");

    const agent = await prisma.agent.findUniqueOrThrow({ where: { id: "winning-agent" } });
    expect(agent.status).toBe("active");
  });

  it("ignores jobs older than the 7-day window", async () => {
    await prisma.agent.create({ data: { id: "stale-agent", engine: "affiliate", status: "active" } });
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    await prisma.dispatchJob.create({
      data: {
        source: "affiliate-agent",
        engine: "affiliate",
        stage: "queued",
        agentId: "stale-agent",
        task: {},
        budgetCap: 100,
        costToDate: 80,
        revenueAttributed: 0,
        createdAt: eightDaysAgo,
      },
    });

    const fired = await checkAndFireKillSwitch();
    expect(fired.map((f) => f.agentId)).not.toContain("stale-agent");
  });
});

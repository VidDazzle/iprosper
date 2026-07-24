import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@apex/db";
import { dispatch } from "../src/dispatch.js";
import { recordSuccessfulRun, promoteAgent } from "../src/agents.js";
import { checkAndFireKillSwitch } from "../src/killSwitch.js";
import { resetDb, teardown } from "./helpers.js";

beforeEach(resetDb);
afterAll(teardown);

describe("trial agent promotion", () => {
  it("stays on trial before trialRunsRequired successful runs", async () => {
    await dispatch({
      agentId: "trial-agent",
      engine: "client-acquisition",
      source: "rebrand-engine",
      task: {},
      budgetCap: 5,
    });

    await recordSuccessfulRun("trial-agent");
    await recordSuccessfulRun("trial-agent");

    const agent = await prisma.agent.findUniqueOrThrow({ where: { id: "trial-agent" } });
    expect(agent.status).toBe("trial");
    expect(agent.trialRunsCompleted).toBe(2);
  });

  it("auto-promotes to active after trialRunsRequired successful runs", async () => {
    await dispatch({
      agentId: "trial-agent-2",
      engine: "client-acquisition",
      source: "rebrand-engine",
      task: {},
      budgetCap: 5,
    });

    await recordSuccessfulRun("trial-agent-2");
    await recordSuccessfulRun("trial-agent-2");
    await recordSuccessfulRun("trial-agent-2");

    const agent = await prisma.agent.findUniqueOrThrow({ where: { id: "trial-agent-2" } });
    expect(agent.status).toBe("active");
    expect(agent.promotedAt).not.toBeNull();

    const auditEntries = await prisma.auditLog.findMany({
      where: { action: "agent_promoted", target: "trial-agent-2" },
    });
    expect(auditEntries.length).toBe(1);
  });

  it("supports manual promotion as an escape hatch", async () => {
    await dispatch({
      agentId: "trial-agent-3",
      engine: "client-acquisition",
      source: "rebrand-engine",
      task: {},
      budgetCap: 5,
    });

    await promoteAgent("trial-agent-3", "operator:test");

    const agent = await prisma.agent.findUniqueOrThrow({ where: { id: "trial-agent-3" } });
    expect(agent.status).toBe("active");
  });
});

describe("kill-switch covers trial agents", () => {
  it("auto-fires for a trial agent whose 7-day spend exceeds revenue", async () => {
    await dispatch({
      agentId: "losing-trial-agent",
      engine: "affiliate",
      source: "affiliate-agent",
      task: {},
      budgetCap: 100,
    });
    // simulate accrued cost beyond revenue within the trial period
    await prisma.dispatchJob.updateMany({
      where: { agentId: "losing-trial-agent" },
      data: { costToDate: 80, revenueAttributed: 10 },
    });

    const agentBefore = await prisma.agent.findUniqueOrThrow({ where: { id: "losing-trial-agent" } });
    expect(agentBefore.status).toBe("trial");

    const fired = await checkAndFireKillSwitch();
    expect(fired.map((f) => f.agentId)).toContain("losing-trial-agent");
  });
});

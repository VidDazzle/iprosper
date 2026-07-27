import { prisma } from "@apex/db";
import { appendAuditLog } from "@apex/audit";
import type { Engine } from "@apex/contracts";

export async function ensureAgent(agentId: string, engine: Engine) {
  return prisma.agent.upsert({
    where: { id: agentId },
    update: {},
    create: { id: agentId, engine, status: "trial" },
  });
}

export class AgentKilledError extends Error {
  constructor(agentId: string) {
    super(`Agent "${agentId}" is killed and cannot accept new dispatches.`);
    this.name = "AgentKilledError";
  }
}

export async function assertAgentActive(agentId: string) {
  const agent = await prisma.agent.findUnique({ where: { id: agentId } });
  if (agent?.status === "killed") {
    throw new AgentKilledError(agentId);
  }
}

/**
 * Loop-engineering addition (task #11): call this when a dispatched job
 * finishes with a passing inspector verdict. A trial agent needs
 * `trialRunsRequired` clean runs before it auto-promotes to `active`
 * (full cadence/budget trust) — this does not touch budgetCap, which is
 * still enforced per-job regardless of trial/active status, so promotion
 * is a trust signal, not a spending-limit change.
 */
export async function recordSuccessfulRun(agentId: string) {
  const agent = await prisma.agent.findUnique({ where: { id: agentId } });
  if (!agent || agent.status !== "trial") return agent;

  const trialRunsCompleted = agent.trialRunsCompleted + 1;

  if (trialRunsCompleted >= agent.trialRunsRequired) {
    const promoted = await prisma.agent.update({
      where: { id: agentId },
      data: { trialRunsCompleted, status: "active", promotedAt: new Date() },
    });
    await appendAuditLog({
      actor: "system:trial-promotion",
      action: "agent_promoted",
      target: agentId,
      detail: { trialRunsCompleted, trialRunsRequired: agent.trialRunsRequired },
    });
    return promoted;
  }

  return prisma.agent.update({ where: { id: agentId }, data: { trialRunsCompleted } });
}

/** Manual escape hatch — an operator can promote an agent early without waiting out the trial count. */
export async function promoteAgent(agentId: string, actor: string) {
  const promoted = await prisma.agent.update({
    where: { id: agentId },
    data: { status: "active", promotedAt: new Date() },
  });
  await appendAuditLog({
    actor,
    action: "agent_promoted_manual",
    target: agentId,
    detail: {},
  });
  return promoted;
}

export * from "./killSwitch.js";

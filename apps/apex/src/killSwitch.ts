import { prisma } from "@apex/db";
import { appendAuditLog } from "@apex/audit";
import type { KillResult } from "@apex/contracts";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Instant halt for one agent (spec Section 1: apex.kill(agentId)).
 * Marks the agent killed and halts every non-terminal job it owns so
 * nothing already queued keeps running after the kill. Both the manual
 * MCP tool call and the hourly auto-fire cron call this same function —
 * there is no separate "auto kill" code path (spec Section 8).
 */
export class UnknownAgentError extends Error {
  constructor(agentId: string) {
    super(`Cannot kill "${agentId}": no agent with this id has ever been dispatched.`);
    this.name = "UnknownAgentError";
  }
}

export async function kill(
  agentId: string,
  reason: string,
  actor: string = "apex.kill",
): Promise<KillResult> {
  const existing = await prisma.agent.findUnique({ where: { id: agentId } });
  if (!existing) {
    throw new UnknownAgentError(agentId);
  }

  const killedAt = new Date();

  const [, haltedJobs] = await prisma.$transaction([
    prisma.agent.update({
      where: { id: agentId },
      data: { status: "killed", killedAt, killReason: reason },
    }),
    prisma.dispatchJob.updateMany({
      where: { agentId, status: { in: ["queued", "running"] } },
      data: { status: "killed" },
    }),
  ]);

  await appendAuditLog({
    actor,
    action: "kill_switch_fired",
    target: agentId,
    detail: { reason, jobsHalted: haltedJobs.count },
  });

  return {
    agentId,
    status: "killed",
    reason,
    killedAt: killedAt.toISOString(),
  };
}

interface RollingWindow {
  agentId: string;
  spend: number;
  revenue: number;
}

/** Pure aggregation step, split out from the DB query so it's unit-testable without Prisma. */
export function computeRollingWindows(
  jobs: { agentId: string; costToDate: number; revenueAttributed: number }[],
): RollingWindow[] {
  const buckets = new Map<string, RollingWindow>();
  for (const job of jobs) {
    const b = buckets.get(job.agentId) ?? { agentId: job.agentId, spend: 0, revenue: 0 };
    b.spend += job.costToDate;
    b.revenue += job.revenueAttributed;
    buckets.set(job.agentId, b);
  }
  return Array.from(buckets.values());
}

export function shouldAutoKill(window: RollingWindow): boolean {
  return window.spend > window.revenue;
}

/**
 * Hourly cron entry point. 7-day rolling spend-vs-revenue window is
 * keyed by DispatchJob.createdAt — i.e. jobs opened in the trailing
 * week, cost and any revenue they've attributed since. Both "trial" and
 * "active" agents are checked — a trial agent still has a real budget
 * cap and can still overspend, so trial status doesn't exempt it from
 * the kill-switch (only "killed" has nothing left to auto-kill).
 */
export async function checkAndFireKillSwitch(now: Date = new Date()) {
  const windowStart = new Date(now.getTime() - SEVEN_DAYS_MS);

  const [activeAgents, jobs] = await Promise.all([
    prisma.agent.findMany({ where: { status: { in: ["trial", "active"] } }, select: { id: true } }),
    prisma.dispatchJob.findMany({
      where: { createdAt: { gte: windowStart } },
      select: { agentId: true, costToDate: true, revenueAttributed: true },
    }),
  ]);

  const activeIds = new Set(activeAgents.map((a) => a.id));
  const windows = computeRollingWindows(
    jobs
      .filter((j) => activeIds.has(j.agentId))
      .map((j) => ({
        agentId: j.agentId,
        costToDate: Number(j.costToDate),
        revenueAttributed: Number(j.revenueAttributed),
      })),
  );

  const fired: KillResult[] = [];
  for (const window of windows) {
    if (shouldAutoKill(window)) {
      const result = await kill(
        window.agentId,
        `auto: 7-day rolling spend ($${window.spend.toFixed(2)}) exceeded revenue ($${window.revenue.toFixed(2)})`,
        "system:kill-switch-cron",
      );
      fired.push(result);
    }
  }
  return fired;
}

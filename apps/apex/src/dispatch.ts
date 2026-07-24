import { prisma } from "@apex/db";
import { appendAuditLog } from "@apex/audit";
import { dispatchTaskInputSchema, type DispatchTaskInput } from "@apex/contracts";
import { ensureAgent, assertAgentActive } from "./agents.js";
import { getDispatchQueue } from "./queue.js";

/**
 * apex.dispatch(agentId, task, budgetCap) — spec Section 1: "queues a
 * sub-agent job with a hard credit cap". Queueing itself has no
 * real-world side effect (no message sent, no money spent) — that
 * happens when a worker (Phase 2) actually processes the job and calls
 * recordCost, which is where the hard cap is enforced.
 */
export async function dispatch(input: DispatchTaskInput) {
  const parsed = dispatchTaskInputSchema.parse(input);

  await ensureAgent(parsed.agentId, parsed.engine);
  await assertAgentActive(parsed.agentId);

  const job = await prisma.dispatchJob.create({
    data: {
      source: parsed.source,
      engine: parsed.engine,
      agentId: parsed.agentId,
      task: parsed.task as never,
      budgetCap: parsed.budgetCap,
      stage: "queued",
      status: "queued",
    },
  });

  await getDispatchQueue().add(
    "run-task",
    { dispatchJobId: job.id, agentId: parsed.agentId, task: parsed.task },
    { jobId: job.id },
  );

  await appendAuditLog({
    actor: parsed.agentId,
    action: "dispatch_queued",
    target: job.id,
    detail: { engine: parsed.engine, source: parsed.source, budgetCap: parsed.budgetCap },
  });

  return job;
}

export class BudgetCapExceededError extends Error {
  constructor(jobId: string, attempted: number, cap: number) {
    super(
      `DispatchJob "${jobId}" attempted to spend $${attempted.toFixed(2)}, exceeding its hard budget cap of $${cap.toFixed(2)}.`,
    );
    this.name = "BudgetCapExceededError";
  }
}

/**
 * The hard-cap enforcement point. Any code that's about to spend money
 * against a DispatchJob must go through this — it never lets
 * costToDate exceed budgetCap, and it hard-fails (does not silently
 * clamp and continue) so a caller can't spend past the cap by accident.
 */
export async function recordCost(jobId: string, amount: number) {
  if (amount < 0) {
    throw new Error(`recordCost amount must be non-negative, got ${amount}`);
  }

  const job = await prisma.dispatchJob.findUnique({ where: { id: jobId } });
  if (!job) {
    throw new Error(`DispatchJob "${jobId}" not found`);
  }
  if (job.status === "killed") {
    throw new Error(`DispatchJob "${jobId}" is killed; refusing to record further cost.`);
  }

  const projected = Number(job.costToDate) + amount;
  const cap = Number(job.budgetCap);

  if (projected > cap) {
    await appendAuditLog({
      actor: "apex.dispatch",
      action: "budget_cap_exceeded",
      target: jobId,
      detail: { attempted: projected, cap },
    });
    throw new BudgetCapExceededError(jobId, projected, cap);
  }

  return prisma.dispatchJob.update({
    where: { id: jobId },
    data: { costToDate: projected },
  });
}

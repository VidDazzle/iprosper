import { prisma } from "@apex/db";
import { appendAuditLog } from "@apex/audit";

export class BudgetCapExceededError extends Error {
  constructor(jobId: string, attempted: number, cap: number) {
    super(
      `DispatchJob "${jobId}" attempted to spend $${attempted.toFixed(2)}, exceeding its hard budget cap of $${cap.toFixed(2)}.`,
    );
    this.name = "BudgetCapExceededError";
  }
}

/**
 * The hard-cap enforcement point for any code that's about to spend
 * money against a DispatchJob — apex.dispatch's own cost recording and
 * the Rebrand Engine worker's per-stage costs both go through this.
 * Never lets costToDate exceed budgetCap; hard-fails (does not silently
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

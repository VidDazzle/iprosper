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

/**
 * Revenue counting rule (spec Section 1 & 8): client-services counts
 * on invoice.paid, affiliate on network-confirmed commission, Evolve
 * on Stripe settlement — all three write through this same
 * DispatchJob.revenueAttributed/invoicePaid pair (the schema only has
 * one such pair; Section 8 describes it for invoice.paid specifically
 * but the rule generalizes across engines). Never counts pending
 * money because callers should only reach this from an actual
 * confirmed-settlement webhook, never speculatively.
 *
 * Idempotent at this layer too (defense in depth on top of the
 * WebhookEvent idempotency check upstream): a job already marked paid
 * is left untouched rather than double-counted.
 */
export async function attributeRevenue(jobId: string, amount: number, confirmedAt: Date = new Date()) {
  if (amount < 0) {
    throw new Error(`attributeRevenue amount must be non-negative, got ${amount}`);
  }

  const job = await prisma.dispatchJob.findUnique({ where: { id: jobId } });
  if (!job) {
    throw new Error(`DispatchJob "${jobId}" not found`);
  }

  if (job.invoicePaid) {
    await appendAuditLog({
      actor: "revenue-attribution",
      action: "duplicate_revenue_attribution_ignored",
      target: jobId,
      detail: { attemptedAmount: amount, existingRevenue: Number(job.revenueAttributed) },
    });
    return job;
  }

  const updated = await prisma.dispatchJob.update({
    where: { id: jobId },
    data: { invoicePaid: true, invoicePaidAt: confirmedAt, revenueAttributed: amount },
  });

  await appendAuditLog({
    actor: "revenue-attribution",
    action: "revenue_attributed",
    target: jobId,
    detail: { amount, confirmedAt: confirmedAt.toISOString() },
  });

  return updated;
}

export * from "./ledger.js";
export * from "./unitEconomics.js";

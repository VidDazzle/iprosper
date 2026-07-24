import { prisma } from "@apex/db";
import { appendAuditLog } from "@apex/audit";
import { getQueue, QUEUE_NAMES } from "@apex/queue";

const MAX_RETRIES = 3; // spec Section 3: "retries failed jobs up to 3x"

// Backoff curve isn't specified numerically in the spec ("with
// backoff" only) — placeholder, env-overridable, same pattern as the
// rebalance thresholds and stage costs.
const BACKOFF_BASE_MS = Number(process.env.SWEEPER_BACKOFF_BASE_MS ?? 5 * 60 * 1000); // 5 min

function backoffDelay(retryCount: number): number {
  return BACKOFF_BASE_MS * 2 ** retryCount;
}

/**
 * Sweeper (spec Section 3): scans failed DispatchJobs, retries up to
 * MAX_RETRIES times with exponential backoff, then escalates via the
 * owner digest exactly once per job (checked against the audit trail
 * so repeated sweep runs don't re-escalate the same job).
 */
export async function sweepFailedJobs() {
  const failedJobs = await prisma.dispatchJob.findMany({ where: { status: "failed" } });

  const retried: string[] = [];
  const escalated: string[] = [];

  for (const job of failedJobs) {
    const agent = await prisma.agent.findUnique({ where: { id: job.agentId } });
    if (agent?.status === "killed") continue; // killed agents don't get retried

    if (job.retryCount < MAX_RETRIES) {
      const delay = backoffDelay(job.retryCount);

      await prisma.dispatchJob.update({
        where: { id: job.id },
        data: { status: "queued", retryCount: job.retryCount + 1 },
      });

      // A fresh jobId per attempt (not job.id again) — BullMQ keeps the
      // original failed job's record around, and re-adding the exact
      // same custom ID would collide with it. Zero colons, since a
      // custom ID containing ':' must split into exactly 3 parts or
      // BullMQ rejects it outright.
      await getQueue(QUEUE_NAMES.apexDispatch).add(
        "run-task",
        { dispatchJobId: job.id, agentId: job.agentId, task: job.task },
        { jobId: `${job.id}-retry${job.retryCount + 1}`, delay },
      );

      await appendAuditLog({
        actor: "system:sweeper",
        action: "sweeper_retry",
        target: job.id,
        detail: { attempt: job.retryCount + 1, maxRetries: MAX_RETRIES, delayMs: delay },
      });

      retried.push(job.id);
    } else {
      const alreadyEscalated = await prisma.auditLog.findFirst({
        where: { action: "sweeper_escalated", target: job.id },
      });
      if (alreadyEscalated) continue;

      await getQueue(QUEUE_NAMES.ownerDigest).add("sweeper-escalation", { dispatchJobId: job.id });
      await appendAuditLog({
        actor: "system:sweeper",
        action: "sweeper_escalated",
        target: job.id,
        detail: { retryCount: job.retryCount, inspectorVerdict: job.inspectorVerdict },
      });

      escalated.push(job.id);
    }
  }

  return { retried, escalated };
}

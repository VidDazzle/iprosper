import { prisma } from "@apex/db";
import { appendAuditLog } from "@apex/audit";

// Not spec-defined (adapted from the Evolve supervisor's "stale work"
// concept, not the APEX spec itself) — how long a job can sit in
// "running" or "queued" with no update before it's presumed dead
// (worker crashed mid-job, or was never picked up). Placeholder,
// env-overridable like the other thresholds in this codebase.
const STUCK_RUNNING_MS = Number(process.env.STUCK_RUNNING_TIMEOUT_MS ?? 30 * 60 * 1000); // 30 min
const STUCK_QUEUED_MS = Number(process.env.STUCK_QUEUED_TIMEOUT_MS ?? 60 * 60 * 1000); // 1h

/**
 * Marks DispatchJobs that have made no progress in too long as
 * "failed" with a clear reason, so they become visible to the Sweeper
 * (spec Section 3) on its next pass instead of sitting invisible
 * forever. Does not touch killed jobs — those are deliberately
 * halted, not stuck.
 */
export async function detectStuckJobs(now: Date = new Date()) {
  const runningCutoff = new Date(now.getTime() - STUCK_RUNNING_MS);
  const queuedCutoff = new Date(now.getTime() - STUCK_QUEUED_MS);

  const stuck = await prisma.dispatchJob.findMany({
    where: {
      OR: [
        { status: "running", updatedAt: { lt: runningCutoff } },
        { status: "queued", updatedAt: { lt: queuedCutoff } },
      ],
    },
  });

  const flagged: string[] = [];

  for (const job of stuck) {
    const stuckForMs = now.getTime() - job.updatedAt.getTime();

    await prisma.dispatchJob.update({
      where: { id: job.id },
      data: {
        status: "failed",
        inspectorVerdict: {
          passed: false,
          checkedAt: now.toISOString(),
          error: `Stuck in "${job.status}" with no progress for ${Math.round(stuckForMs / 60000)} minutes — presumed dead (worker crash or never picked up).`,
        } as never,
      },
    });

    await appendAuditLog({
      actor: "system:stuck-job-detector",
      action: "stuck_job_marked_failed",
      target: job.id,
      detail: { previousStatus: job.status, stuckForMs },
    });

    flagged.push(job.id);
  }

  return flagged;
}

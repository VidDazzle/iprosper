import { Worker } from "bullmq";
import { prisma } from "@apex/db";
import { loadEnv } from "@apex/config";
import { getRedisConnection, QUEUE_NAMES } from "@apex/queue";
import { runPipeline } from "@apex/pipeline";

const env = loadEnv();

interface DispatchJobPayload {
  dispatchJobId: string;
  agentId: string;
  task: unknown;
}

/**
 * Consumes apex.dispatch's queue and routes by DispatchJob.source.
 * Only "rebrand-engine" has a real pipeline in this build — other
 * sources ("affiliate-agent", "evolve") aren't implemented yet, and are
 * explicitly marked failed with a clear reason rather than left stuck
 * in "queued" forever or silently treated as done.
 */
async function processJob(payload: DispatchJobPayload) {
  const job = await prisma.dispatchJob.findUnique({ where: { id: payload.dispatchJobId } });
  if (!job) {
    console.error(`[worker] DispatchJob ${payload.dispatchJobId} not found — skipping.`);
    return;
  }

  if (job.source !== "rebrand-engine") {
    console.warn(`[worker] No pipeline implemented for source "${job.source}" yet — marking failed.`);
    await prisma.dispatchJob.update({
      where: { id: job.id },
      data: {
        status: "failed",
        inspectorVerdict: {
          passed: false,
          checkedAt: new Date().toISOString(),
          error: `No worker pipeline implemented for source "${job.source}".`,
        } as never,
      },
    });
    return;
  }

  return runPipeline(job.id);
}

async function main() {
  console.info(`[worker] starting — LIVE_MODE=${env.LIVE_MODE}`);

  const worker = new Worker<DispatchJobPayload>(
    QUEUE_NAMES.apexDispatch,
    async (job) => processJob(job.data),
    { connection: getRedisConnection(), concurrency: 2 },
  );

  worker.on("failed", (job, err) => {
    console.error(`[worker] job ${job?.id} failed:`, err.message);
  });

  process.on("SIGTERM", async () => {
    await worker.close();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("[worker] fatal error during startup:", err);
  process.exit(1);
});

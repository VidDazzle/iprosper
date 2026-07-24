import { Worker } from "bullmq";
import { prisma } from "@apex/db";
import { loadEnv } from "@apex/config";
import { getRedisConnection, QUEUE_NAMES } from "@apex/queue";
import {
  runPipeline,
  processCloserTouch,
  processEscalationCheck,
  processNurtureTouch,
  processNurtureDormant,
  startNurtureQueue,
} from "@apex/pipeline";

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
async function processDispatchJob(payload: DispatchJobPayload) {
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

async function processCloserJob(name: string, data: { leadId: string; sequence?: number }) {
  if (name === "touch") {
    return processCloserTouch(data.leadId, data.sequence!);
  }
  if (name === "escalation-check") {
    return processEscalationCheck(data.leadId, startNurtureQueue);
  }
  console.warn(`[worker] unknown closer-dispatch job name "${name}"`);
}

async function processNurtureJob(name: string, data: { leadId: string; day?: number }) {
  if (name === "nurture-touch") {
    return processNurtureTouch(data.leadId, data.day!);
  }
  if (name === "nurture-dormant") {
    return processNurtureDormant(data.leadId);
  }
  console.warn(`[worker] unknown nurture-dispatch job name "${name}"`);
}

async function main() {
  console.info(`[worker] starting — LIVE_MODE=${env.LIVE_MODE}`);

  const connection = getRedisConnection();

  const dispatchWorker = new Worker<DispatchJobPayload>(
    QUEUE_NAMES.apexDispatch,
    async (job) => processDispatchJob(job.data),
    { connection, concurrency: 2 },
  );

  const closerWorker = new Worker(
    QUEUE_NAMES.closerDispatch,
    async (job) => processCloserJob(job.name, job.data),
    { connection, concurrency: 5 },
  );

  const nurtureWorker = new Worker(
    QUEUE_NAMES.nurtureDispatch,
    async (job) => processNurtureJob(job.name, job.data),
    { connection, concurrency: 5 },
  );

  for (const [name, worker] of [
    ["dispatch", dispatchWorker],
    ["closer", closerWorker],
    ["nurture", nurtureWorker],
  ] as const) {
    worker.on("failed", (job, err) => {
      console.error(`[worker:${name}] job ${job?.id} failed:`, err.message);
    });
  }

  process.on("SIGTERM", async () => {
    await Promise.all([dispatchWorker.close(), closerWorker.close(), nurtureWorker.close()]);
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("[worker] fatal error during startup:", err);
  process.exit(1);
});

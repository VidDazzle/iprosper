import { prisma } from "@apex/db";
import { appendAuditLog } from "@apex/audit";
import { ensureAgent, assertAgentActive } from "@apex/agents";
import { dispatchTaskInputSchema, type DispatchTaskInput } from "@apex/contracts";
import { getQueue, QUEUE_NAMES } from "@apex/queue";

/**
 * apex.dispatch(agentId, task, budgetCap) — spec Section 1: "queues a
 * sub-agent job with a hard credit cap". Queueing itself has no
 * real-world side effect (no message sent, no money spent) — that
 * happens when a worker actually processes the job and calls
 * recordCost (@apex/spend), which is where the hard cap is enforced.
 *
 * Shared package (not inside apps/apex) so apps/web's lead-in flow
 * (submitting a URL) can call it directly without importing another
 * app.
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

  await getQueue(QUEUE_NAMES.apexDispatch).add(
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

export * from "./sweeper.js";
export * from "./stuckJobs.js";

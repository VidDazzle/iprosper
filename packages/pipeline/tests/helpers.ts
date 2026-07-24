import { prisma } from "@apex/db";
import { closeAllQueueConnections, getRedisConnection } from "@apex/queue";

export async function resetDb() {
  // notify.ts's captureLead() enqueues real BullMQ jobs (closer-dispatch,
  // owner-digest) — flush so orphaned jobs don't pile up across runs.
  await getRedisConnection().flushdb();

  await prisma.touch.deleteMany();
  await prisma.jobOutcome.deleteMany();
  await prisma.brandKit.deleteMany();
  await prisma.previewResult.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.webhookEvent.deleteMany();
  await prisma.mediaLicense.deleteMany();

  await prisma.auditLog.deleteMany();
  await prisma.dispatchJob.deleteMany();
  await prisma.engineWeek.deleteMany();
  await prisma.agent.deleteMany();
  await prisma.opportunityCandidate.deleteMany();
}

export async function teardown() {
  await closeAllQueueConnections();
  await prisma.$disconnect();
}

export async function createTestJob(overrides: Partial<Parameters<typeof prisma.dispatchJob.create>[0]["data"]> = {}) {
  await prisma.agent.upsert({
    where: { id: "test-rebrand-agent" },
    update: {},
    create: { id: "test-rebrand-agent", engine: "client-acquisition", status: "trial" },
  });

  return prisma.dispatchJob.create({
    data: {
      source: "rebrand-engine",
      engine: "client-acquisition",
      agentId: "test-rebrand-agent",
      task: { url: "https://example.com", ip: "127.0.0.1", ts: new Date().toISOString() },
      budgetCap: 5,
      stage: "queued",
      status: "queued",
      ...overrides,
    },
  });
}

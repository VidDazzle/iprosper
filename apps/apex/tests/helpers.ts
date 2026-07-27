import { prisma } from "@apex/db";
import { getRedisConnection } from "@apex/queue";
import { closeQueueConnections } from "../src/queue.js";

export async function resetDb() {
  // Every dispatch() call in these tests enqueues a real BullMQ job.
  // Without flushing, orphaned jobs pile up in Redis across test runs
  // since nothing here ever consumes the queue.
  await getRedisConnection().flushdb();

  // child tables first (FK references DispatchJob/Lead)
  await prisma.touch.deleteMany();
  await prisma.jobOutcome.deleteMany();
  await prisma.brandKit.deleteMany();
  await prisma.previewResult.deleteMany();
  await prisma.mockSite.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.webhookEvent.deleteMany();
  await prisma.mediaLicense.deleteMany();

  await prisma.auditLog.deleteMany();
  await prisma.dispatchJob.deleteMany();
  await prisma.engineWeek.deleteMany();
  await prisma.agent.deleteMany();
  await prisma.opportunityCandidate.deleteMany();
  await prisma.weeklyDigest.deleteMany();
  await prisma.systemHeartbeat.deleteMany();
}

export async function teardown() {
  await closeQueueConnections();
  await prisma.$disconnect();
}

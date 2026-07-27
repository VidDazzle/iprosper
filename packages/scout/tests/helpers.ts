import { prisma } from "@apex/db";
import { closeAllQueueConnections, getRedisConnection } from "@apex/queue";

export async function resetDb() {
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

  await prisma.opportunityCandidate.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.dispatchJob.deleteMany();
  await prisma.engineWeek.deleteMany();
  await prisma.agent.deleteMany();
}

export async function teardown() {
  await closeAllQueueConnections();
  await prisma.$disconnect();
}

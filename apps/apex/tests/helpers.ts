import { prisma } from "@apex/db";
import { closeQueueConnections } from "../src/queue.js";

export async function resetDb() {
  await prisma.auditLog.deleteMany();
  await prisma.dispatchJob.deleteMany();
  await prisma.engineWeek.deleteMany();
  await prisma.agent.deleteMany();
  await prisma.opportunityCandidate.deleteMany();
}

export async function teardown() {
  await closeQueueConnections();
  await prisma.$disconnect();
}

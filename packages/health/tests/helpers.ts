import { prisma } from "@apex/db";
import { closeAllQueueConnections } from "@apex/queue";

export async function resetDb() {
  await prisma.systemHeartbeat.deleteMany();
}

export async function teardown() {
  await closeAllQueueConnections();
  await prisma.$disconnect();
}

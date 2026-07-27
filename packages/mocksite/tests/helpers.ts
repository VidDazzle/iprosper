import { prisma } from "@apex/db";

export async function resetDb() {
  await prisma.mockSite.deleteMany();
  await prisma.dispatchJob.deleteMany();
  await prisma.agent.deleteMany();
}

export async function teardown() {
  await prisma.$disconnect();
}

export async function createTestJob() {
  await prisma.agent.upsert({
    where: { id: "test-mocksite-agent" },
    update: {},
    create: { id: "test-mocksite-agent", engine: "client-acquisition", status: "trial" },
  });

  return prisma.dispatchJob.create({
    data: {
      source: "rebrand-engine",
      engine: "client-acquisition",
      agentId: "test-mocksite-agent",
      task: { url: "https://example.com" },
      budgetCap: 5,
      stage: "queued",
      status: "queued",
    },
  });
}

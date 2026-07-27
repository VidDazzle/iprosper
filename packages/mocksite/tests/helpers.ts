import { prisma } from "@apex/db";

export async function resetDb() {
  // child tables first (FK references DispatchJob/Lead) — full order
  // matching every other package's helpers, since tests run against a
  // shared dev DB and leftover rows from other suites can otherwise
  // violate a FK this package's own tests never created.
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

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

/** A job + BrandKit + PreviewResult + Lead, ready for Closer/nurture tests. */
export async function createTestLead(
  overrides: { consentTimestamp?: Date; status?: string } = {},
) {
  const job = await createTestJob();
  await prisma.brandKit.create({
    data: {
      jobId: job.id,
      name: "Coastal Roofing Co",
      palette: ["#1e6b3d"],
      fonts: ["Poppins"],
      services: ["Roof Repair", "Solar Panel Installation"],
      reviews: [],
    },
  });
  await prisma.previewResult.create({
    data: { jobId: job.id, previewUrl: "https://example.com/preview/abc", expiresAt: new Date(Date.now() + 86400000) },
  });

  const { consentTimestamp, ...rest } = overrides;
  const lead = await prisma.lead.create({
    data: {
      jobId: job.id,
      name: "Jane Test",
      email: "jane@test.com",
      consentTimestamp: consentTimestamp ?? new Date(),
      consentText: "I agree to be contacted.",
      source: "rebrand-engine-preview",
      status: "active",
      ...rest,
    },
  });

  await prisma.dispatchJob.update({ where: { id: job.id }, data: { leadId: lead.id } });

  return { job, lead };
}

import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@apex/db";
import { getQueue, QUEUE_NAMES } from "@apex/queue";
import { runScout, approveOpportunity, rejectOpportunity, OpportunityNotApprovableError } from "../src/scout.js";
import { NoopSignalSource, type SignalSource } from "../src/signalSource.js";
import type { CandidateInput } from "../src/scoring.js";
import { resetDb, teardown } from "./helpers.js";

beforeEach(resetDb);
afterAll(teardown);

class FakeSignalSource implements SignalSource {
  name = "fake";
  constructor(private candidates: CandidateInput[]) {}
  async gatherCandidates() {
    return this.candidates;
  }
}

const strongCandidate: CandidateInput = {
  name: "Solar Installers Vertical",
  category: "new-vertical",
  estRevenueMonthly: 5000,
  confidence: "high",
  confidenceBasis: "Based on comparable APEX historical conversion data across 4 built-vertical launches",
  estBuildHours: 20,
  infraReuse: ["packages/pipeline", "packages/renderer"],
  complianceFlags: [],
};

const weakCandidate: CandidateInput = {
  name: "Vague Idea",
  category: "new-app",
  estRevenueMonthly: 100,
  confidence: "high",
  confidenceBasis: "trust me",
  estBuildHours: 200,
  infraReuse: [],
  complianceFlags: [],
};

describe("runScout", () => {
  it("does nothing with no signal sources beyond a no-op", async () => {
    const created = await runScout([new NoopSignalSource()]);
    expect(created).toEqual([]);
  });

  it("persists every candidate but only digests ones above threshold", async () => {
    const created = await runScout([new FakeSignalSource([strongCandidate, weakCandidate])]);
    expect(created).toHaveLength(2);

    const rows = await prisma.opportunityCandidate.findMany();
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.status === "pending_review")).toBe(true);

    const strong = created.find((c) => c.name === "Solar Installers Vertical")!;
    const weak = created.find((c) => c.name === "Vague Idea")!;
    expect(strong.aboveThreshold).toBe(true);
    expect(weak.aboveThreshold).toBe(false); // capped to low confidence + high build hours + no infra reuse

    const digestJobs = await getQueue(QUEUE_NAMES.ownerDigest).getJobs(["waiting"]);
    expect(digestJobs.some((j) => j.data.candidateId === strong.id)).toBe(true);
    expect(digestJobs.some((j) => j.data.candidateId === weak.id)).toBe(false);
  });

  it("never calls dispatch — candidates only ever land as pending_review", async () => {
    await runScout([new FakeSignalSource([strongCandidate])]);
    const jobs = await prisma.dispatchJob.findMany();
    expect(jobs).toHaveLength(0);
  });
});

describe("approveOpportunity", () => {
  it("turns an approved candidate into a real DispatchJob with the given budget cap", async () => {
    const [created] = await runScout([new FakeSignalSource([strongCandidate])]);

    const job = await approveOpportunity(created.id, "operator:test", "scout-vertical-agent", 50);

    expect(Number(job.budgetCap)).toBe(50);
    expect(job.engine).toBe("client-acquisition"); // new-vertical -> client-acquisition
    expect(job.source).toBe("scout-approved");

    const candidate = await prisma.opportunityCandidate.findUniqueOrThrow({ where: { id: created.id } });
    expect(candidate.status).toBe("approved");

    const auditEntries = await prisma.auditLog.findMany({ where: { action: "opportunity_approved" } });
    expect(auditEntries).toHaveLength(1);
  });

  it("refuses to approve the same candidate twice", async () => {
    const [created] = await runScout([new FakeSignalSource([strongCandidate])]);
    await approveOpportunity(created.id, "operator:test", "agent-1", 50);

    await expect(approveOpportunity(created.id, "operator:test", "agent-1", 50)).rejects.toBeInstanceOf(
      OpportunityNotApprovableError,
    );
  });

  it("refuses to approve a nonexistent candidate", async () => {
    await expect(approveOpportunity("nonexistent", "operator:test", "agent-1", 50)).rejects.toBeInstanceOf(
      OpportunityNotApprovableError,
    );
  });
});

describe("rejectOpportunity", () => {
  it("marks a candidate rejected with an audit trail", async () => {
    const [created] = await runScout([new FakeSignalSource([strongCandidate])]);
    await rejectOpportunity(created.id, "operator:test", "not a fit right now");

    const candidate = await prisma.opportunityCandidate.findUniqueOrThrow({ where: { id: created.id } });
    expect(candidate.status).toBe("rejected");

    const auditEntries = await prisma.auditLog.findMany({ where: { action: "opportunity_rejected" } });
    expect(auditEntries).toHaveLength(1);
  });
});

import { describe, it, expect, beforeEach, afterEach, afterAll } from "vitest";
import { prisma } from "@apex/db";
import { __resetEnvCacheForTests } from "@apex/config";
import { runScout } from "../src/scout.js";
import { NoopSignalSource } from "../src/signalSource.js";
import {
  isAutonomouslyEligible,
  getRollingAutonomousSpend,
  runAutonomousApprovalSweep,
} from "../src/autonomousApproval.js";
import type { CandidateInput } from "../src/scoring.js";
import { resetDb, teardown } from "./helpers.js";

beforeEach(resetDb);
afterAll(teardown);

afterEach(() => {
  delete process.env.LIVE_MODE;
  delete process.env.AUTONOMOUS_APPROVAL_ENABLED;
  delete process.env.AUTONOMOUS_DISPATCH_CAP;
  delete process.env.AUTONOMOUS_WEEKLY_SPEND_CAP;
  delete process.env.AUTONOMOUS_ESCALATION_CAP;
  __resetEnvCacheForTests();
});

class FakeSignalSource {
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

const flaggedCandidate: CandidateInput = {
  ...strongCandidate,
  name: "Flagged Vertical",
  complianceFlags: ["needs-license-review"],
};

function enableAutonomy(overrides: Record<string, string> = {}) {
  process.env.LIVE_MODE = "true";
  process.env.AUTONOMOUS_APPROVAL_ENABLED = "true";
  Object.assign(process.env, overrides);
  __resetEnvCacheForTests();
}

describe("isAutonomouslyEligible", () => {
  it("is eligible when the score clears the threshold and there are no compliance flags", () => {
    expect(isAutonomouslyEligible({ score: 5, complianceFlags: [] })).toBe(true);
  });

  it("is not eligible below the score threshold", () => {
    expect(isAutonomouslyEligible({ score: 0, complianceFlags: [] })).toBe(false);
  });

  it("is never eligible with a compliance flag, regardless of score", () => {
    expect(isAutonomouslyEligible({ score: 100, complianceFlags: ["needs-license-review"] })).toBe(false);
  });
});

describe("getRollingAutonomousSpend", () => {
  it("sums only autonomous-approval budgetCap within the trailing 7 days", async () => {
    const now = new Date();
    await prisma.auditLog.create({
      data: {
        actor: "system:autonomous-approval",
        action: "opportunity_approved",
        target: "c1",
        detail: { budgetCap: 15 },
        createdAt: now,
      },
    });
    // Human approval — must not count toward the autonomous cap.
    await prisma.auditLog.create({
      data: {
        actor: "operator:jane",
        action: "opportunity_approved",
        target: "c2",
        detail: { budgetCap: 999 },
        createdAt: now,
      },
    });
    // Outside the 7-day window — must not count.
    await prisma.auditLog.create({
      data: {
        actor: "system:autonomous-approval",
        action: "opportunity_approved",
        target: "c3",
        detail: { budgetCap: 15 },
        createdAt: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000),
      },
    });

    expect(await getRollingAutonomousSpend(now)).toBe(15);
  });
});

describe("runAutonomousApprovalSweep", () => {
  it("no-ops entirely when not live", async () => {
    const [created] = await runScout([new FakeSignalSource([strongCandidate])]);

    const result = await runAutonomousApprovalSweep();
    expect(result).toEqual({ autoApproved: [], requestsSent: [] });

    const candidate = await prisma.opportunityCandidate.findUniqueOrThrow({ where: { id: created.id } });
    expect(candidate.status).toBe("pending_review");
  });

  it("auto-approves an eligible candidate at the fixed dispatch cap when live", async () => {
    enableAutonomy({ AUTONOMOUS_DISPATCH_CAP: "15", AUTONOMOUS_WEEKLY_SPEND_CAP: "100" });
    const [created] = await runScout([new FakeSignalSource([strongCandidate])]);

    const result = await runAutonomousApprovalSweep();
    expect(result.autoApproved).toEqual([created.id]);

    const candidate = await prisma.opportunityCandidate.findUniqueOrThrow({ where: { id: created.id } });
    expect(candidate.status).toBe("approved");

    const job = await prisma.dispatchJob.findFirstOrThrow({ where: { agentId: `scout-auto-${created.id}` } });
    expect(Number(job.budgetCap)).toBe(15); // the fixed hard cap, not the candidate's own revenue projection
  });

  it("never auto-approves a compliance-flagged candidate, and sends an approval request instead", async () => {
    enableAutonomy({ AUTONOMOUS_DISPATCH_CAP: "15", AUTONOMOUS_WEEKLY_SPEND_CAP: "100" });
    const [created] = await runScout([new FakeSignalSource([flaggedCandidate])]);

    const result = await runAutonomousApprovalSweep();
    expect(result.autoApproved).toEqual([]);
    expect(result.requestsSent).toEqual([created.id]);

    const candidate = await prisma.opportunityCandidate.findUniqueOrThrow({ where: { id: created.id } });
    expect(candidate.status).toBe("pending_review");

    const requestLog = await prisma.auditLog.findFirst({ where: { action: "approval_request_sent", target: created.id } });
    expect(requestLog).toBeTruthy();
  });

  it("stops auto-approving once the weekly cap would be exceeded, and sends a request for the rest", async () => {
    enableAutonomy({ AUTONOMOUS_DISPATCH_CAP: "15", AUTONOMOUS_WEEKLY_SPEND_CAP: "15" });
    const second: CandidateInput = { ...strongCandidate, name: "Second Vertical" };
    const [first, secondCreated] = await runScout([new FakeSignalSource([strongCandidate, second])]);

    const result = await runAutonomousApprovalSweep();
    expect(result.autoApproved).toHaveLength(1);
    expect(result.requestsSent).toHaveLength(1);
    expect([first.id, secondCreated.id]).toEqual(expect.arrayContaining([...result.autoApproved, ...result.requestsSent]));
  });

  it("does not resend an approval request within 24h of the last one", async () => {
    enableAutonomy({ AUTONOMOUS_DISPATCH_CAP: "15", AUTONOMOUS_WEEKLY_SPEND_CAP: "100" });
    const [created] = await runScout([new FakeSignalSource([flaggedCandidate])]);

    const first = await runAutonomousApprovalSweep();
    expect(first.requestsSent).toEqual([created.id]);

    const second = await runAutonomousApprovalSweep();
    expect(second.requestsSent).toEqual([]);

    const requestLogs = await prisma.auditLog.findMany({ where: { action: "approval_request_sent", target: created.id } });
    expect(requestLogs).toHaveLength(1);
  });
});

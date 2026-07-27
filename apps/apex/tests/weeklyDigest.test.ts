import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@apex/db";
import { computeWeeklyDigestContent, generateAndDeliverWeeklyDigest } from "@apex/digest";
import { resetDb, teardown } from "./helpers.js";

beforeEach(resetDb);
afterAll(teardown);

function mondayOf(d: Date): Date {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  date.setUTCDate(date.getUTCDate() - diff);
  return date;
}

describe("computeWeeklyDigestContent", () => {
  it("aggregates previews, leads, touches, closes, and ROI for the most recently completed week", async () => {
    const now = new Date();
    const thisWeekStart = mondayOf(now);
    const lastWeekStart = new Date(thisWeekStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    const midLastWeek = new Date(lastWeekStart.getTime() + 2 * 24 * 60 * 60 * 1000);

    await prisma.agent.create({ data: { id: "digest-agent", engine: "client-acquisition", status: "trial" } });
    const job = await prisma.dispatchJob.create({
      data: {
        source: "rebrand-engine",
        engine: "client-acquisition",
        agentId: "digest-agent",
        task: {},
        budgetCap: 100,
        costToDate: 20,
        invoicePaid: true,
        invoicePaidAt: midLastWeek,
        revenueAttributed: 300,
        stage: "closed",
        status: "completed",
        createdAt: midLastWeek,
      },
    });
    await prisma.previewResult.create({
      data: { jobId: job.id, previewUrl: "https://x", expiresAt: now, createdAt: midLastWeek },
    });
    const lead = await prisma.lead.create({
      data: {
        jobId: job.id,
        name: "A",
        email: "a@b.com",
        consentTimestamp: midLastWeek,
        consentText: "yes",
        source: "rebrand-engine-preview",
        createdAt: midLastWeek,
      },
    });
    await prisma.touch.create({
      data: { leadId: lead.id, phase: "closer", channel: "sms", sequence: 1, sentAt: midLastWeek },
    });
    await prisma.auditLog.create({
      data: { actor: "system", action: "kill_switch_fired", target: "some-agent", detail: {}, createdAt: midLastWeek },
    });

    const content = await computeWeeklyDigestContent(now);

    expect(content.previewsGenerated).toBe(1);
    expect(content.leadsCaptured).toBe(1);
    expect(content.consentRate).toBe(1);
    expect(content.touchesByChannel.sms).toBe(1);
    expect(content.closes).toBe(1);
    expect(content.costPerClose).toBe(20);
    expect(content.totalSpend).toBe(20);
    expect(content.totalRevenue).toBe(300);
    expect(content.killSwitchEvents).toHaveLength(1);

    const clientEngine = content.roiPerEngine.find((r) => r.engine === "client-acquisition")!;
    expect(clientEngine.spend).toBe(20);
    expect(clientEngine.revenue).toBe(300);
  });

  it("returns zeroed values (not NaN/errors) for a week with no activity", async () => {
    const content = await computeWeeklyDigestContent();
    expect(content.previewsGenerated).toBe(0);
    expect(content.consentRate).toBe(0);
    expect(content.costPerClose).toBeNull();
    expect(content.roiPerEngine).toHaveLength(3);
  });
});

describe("generateAndDeliverWeeklyDigest", () => {
  it("persists a WeeklyDigest row and marks undelivered when no webhook is configured", async () => {
    const digest = await generateAndDeliverWeeklyDigest();
    expect(digest.delivered).toBe(false);

    const stored = await prisma.weeklyDigest.findUnique({ where: { id: digest.id } });
    expect(stored).toBeTruthy();
  });

  it("is idempotent for the same week — a second run updates rather than duplicates", async () => {
    const first = await generateAndDeliverWeeklyDigest();
    const second = await generateAndDeliverWeeklyDigest();
    expect(second.id).toBe(first.id);

    const count = await prisma.weeklyDigest.count();
    expect(count).toBe(1);
  });
});

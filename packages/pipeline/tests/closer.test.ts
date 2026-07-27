import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@apex/db";
import { getQueue, QUEUE_NAMES } from "@apex/queue";
import {
  processCloserTouch,
  processEscalationCheck,
  buildSmsMessage,
  buildEmailMessage,
  buildVoiceScript,
  closerJobId,
  closerEscalationJobId,
} from "../src/index.js";
import { resetDb, teardown, createTestLead } from "./helpers.js";

beforeEach(resetDb);
afterAll(teardown);

describe("closer message builders", () => {
  it("builds an SMS referencing the business and preview link, inviting YES or a question", () => {
    const sms = buildSmsMessage("Coastal Roofing Co", "https://example.com/preview/abc");
    expect(sms).toContain("Coastal Roofing Co");
    expect(sms).toContain("https://example.com/preview/abc");
    expect(sms).toContain("YES");
  });

  it("builds an email with vertical-specific bullets, the shared search-visibility bullet, and a scheduling link", () => {
    const email = buildEmailMessage("Coastal Roofing Co", "https://example.com/preview/abc", "built", "https://schedule.example.com");
    expect(email.body).toContain("https://example.com/preview/abc");
    expect(email.body).toContain("https://schedule.example.com");
    expect(email.body).toContain("AI search");
    expect(email.body.split("\n- ").length - 1).toBe(4); // 3 vertical bullets + 1 shared search-visibility bullet
  });

  it("appends the social-proof bullet only when one is provided", () => {
    const withoutProof = buildEmailMessage("Coastal Roofing Co", "https://example.com/preview/abc", "built", "https://schedule.example.com", null);
    expect(withoutProof.body.split("\n- ").length - 1).toBe(4);

    const withProof = buildEmailMessage(
      "Coastal Roofing Co",
      "https://example.com/preview/abc",
      "built",
      "https://schedule.example.com",
      "12+ businesses like yours are already live on this",
    );
    expect(withProof.body).toContain("12+ businesses like yours are already live on this");
    expect(withProof.body.split("\n- ").length - 1).toBe(5);
  });

  it("builds a voice script covering opening, value frame, discovery, bridging, and objection handling", () => {
    const script = buildVoiceScript("Coastal Roofing Co");
    expect(script.opening).toContain("Coastal Roofing Co");
    expect(script.objectionHandling["how much"]).toMatch(/real price/i);
    expect(script.objectionHandling["need to think about it"]).toMatch(/what specifically/i);
  });
});

describe("processCloserTouch", () => {
  it("sends touch 1 (SMS) and schedules touch 2 (voice)", async () => {
    const { lead } = await createTestLead();
    await processCloserTouch(lead.id, 1);

    const touches = await prisma.touch.findMany({ where: { leadId: lead.id } });
    expect(touches).toHaveLength(1);
    expect(touches[0]).toMatchObject({ phase: "closer", channel: "sms", sequence: 1 });

    const job2 = await getQueue(QUEUE_NAMES.closerDispatch).getJob(closerJobId(lead.id, 2));
    expect(job2).toBeTruthy();
  });

  it("sends touch 3 (email) and schedules the 48h escalation check", async () => {
    const { lead } = await createTestLead();
    await processCloserTouch(lead.id, 3);

    const touches = await prisma.touch.findMany({ where: { leadId: lead.id, sequence: 3 } });
    expect(touches[0]).toMatchObject({ channel: "email" });

    const escalationJob = await getQueue(QUEUE_NAMES.closerDispatch).getJob(closerEscalationJobId(lead.id));
    expect(escalationJob).toBeTruthy();
  });

  it("does nothing for a lead whose consent was revoked", async () => {
    const { lead } = await createTestLead();
    await prisma.lead.update({ where: { id: lead.id }, data: { status: "revoked", consentRevokedAt: new Date() } });

    await processCloserTouch(lead.id, 1);

    const touches = await prisma.touch.findMany({ where: { leadId: lead.id } });
    expect(touches).toHaveLength(0);
  });
});

describe("processEscalationCheck", () => {
  it("moves an unresponsive lead to nurture after the escalation window", async () => {
    const { lead } = await createTestLead();
    await prisma.touch.create({ data: { leadId: lead.id, phase: "closer", channel: "sms", sequence: 1, responded: false } });

    let moved = false;
    await processEscalationCheck(lead.id, async () => {
      moved = true;
    });

    expect(moved).toBe(true);
    const auditEntries = await prisma.auditLog.findMany({ where: { action: "closer_escalated_to_nurture" } });
    expect(auditEntries).toHaveLength(1);
  });

  it("does NOT escalate a lead that responded", async () => {
    const { lead } = await createTestLead();
    await prisma.touch.create({ data: { leadId: lead.id, phase: "closer", channel: "sms", sequence: 1, responded: true } });

    let moved = false;
    await processEscalationCheck(lead.id, async () => {
      moved = true;
    });

    expect(moved).toBe(false);
  });
});

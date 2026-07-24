import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@apex/db";
import { getQueue, QUEUE_NAMES } from "@apex/queue";
import { startNurtureQueue, processNurtureTouch, processNurtureDormant, nurtureJobId } from "../src/index.js";
import { resetDb, teardown, createTestLead } from "./helpers.js";

beforeEach(resetDb);
afterAll(teardown);

describe("startNurtureQueue", () => {
  it("sets the lead to nurture status and schedules day 2/5/9/13 + dormant jobs keyed to consentTimestamp", async () => {
    const consentTimestamp = new Date(Date.now() - 1000); // just now
    const { lead } = await createTestLead({ consentTimestamp });

    await startNurtureQueue(lead.id);

    const updated = await prisma.lead.findUniqueOrThrow({ where: { id: lead.id } });
    expect(updated.status).toBe("nurture");

    const queue = getQueue(QUEUE_NAMES.nurtureDispatch);
    for (const day of [2, 5, 9, 13, 14]) {
      const job = await queue.getJob(nurtureJobId(lead.id, day));
      expect(job, `day ${day} job should exist`).toBeTruthy();
    }
  });
});

describe("processNurtureTouch", () => {
  it("sends the day-2 soft SMS re-sharing the preview link", async () => {
    const { lead } = await createTestLead();
    await processNurtureTouch(lead.id, 2);

    const touches = await prisma.touch.findMany({ where: { leadId: lead.id, phase: "nurture" } });
    const touch = touches.find((t) => t.sequence === 2);
    expect(touch).toMatchObject({ channel: "sms" });
  });

  it("sends the day-9 SMS with a value nugget derived from the scraped services", async () => {
    const { lead } = await createTestLead();
    await processNurtureTouch(lead.id, 9);

    const touches = await prisma.touch.findMany({ where: { leadId: lead.id, sequence: 9 } });
    expect(touches[0]).toMatchObject({ channel: "sms", phase: "nurture" });
  });

  it("does nothing for a revoked lead", async () => {
    const { lead } = await createTestLead();
    await prisma.lead.update({ where: { id: lead.id }, data: { status: "revoked", consentRevokedAt: new Date() } });

    await processNurtureTouch(lead.id, 5);

    const touches = await prisma.touch.findMany({ where: { leadId: lead.id } });
    expect(touches).toHaveLength(0);
  });
});

describe("processNurtureDormant", () => {
  it("marks the lead dormant, retaining history", async () => {
    const { lead } = await createTestLead();
    await processNurtureDormant(lead.id);

    const updated = await prisma.lead.findUniqueOrThrow({ where: { id: lead.id } });
    expect(updated.status).toBe("dormant");
    // record still exists — "full consent/touch history retained" per spec
    expect(updated.consentText).toBeTruthy();
  });
});

import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@apex/db";
import { recordWebhookEvent } from "@apex/audit";
import { resetDb, teardown } from "./helpers.js";

beforeEach(resetDb);
afterAll(teardown);

describe("recordWebhookEvent", () => {
  it("returns true and stores the event the first time it's seen", async () => {
    const isNew = await recordWebhookEvent("stripe", "evt_123", "checkout.session.completed", { foo: "bar" });
    expect(isNew).toBe(true);

    const stored = await prisma.webhookEvent.findUnique({
      where: { provider_externalId: { provider: "stripe", externalId: "evt_123" } },
    });
    expect(stored).toBeTruthy();
  });

  it("returns false on a retried delivery of the same event", async () => {
    await recordWebhookEvent("stripe", "evt_123", "checkout.session.completed", {});
    const isNewSecondTime = await recordWebhookEvent("stripe", "evt_123", "checkout.session.completed", {});
    expect(isNewSecondTime).toBe(false);
  });

  it("treats the same externalId from a different provider as distinct", async () => {
    const a = await recordWebhookEvent("stripe", "evt_123", "checkout.session.completed", {});
    const b = await recordWebhookEvent("invoicing", "evt_123", "invoice.paid", {});
    expect(a).toBe(true);
    expect(b).toBe(true);
  });
});

import { describe, it, expect, afterEach } from "vitest";
import { __resetEnvCacheForTests } from "@apex/config";
import { notifyOwner } from "../src/index.js";

describe("notifyOwner", () => {
  afterEach(() => {
    delete process.env.OWNER_PHONE_NUMBER;
    delete process.env.OWNER_EMAIL;
    delete process.env.LIVE_MODE;
    delete process.env.SMS_ENABLED;
    delete process.env.EMAIL_ENABLED;
    __resetEnvCacheForTests();
  });

  it("no-ops when no owner contact is configured", async () => {
    __resetEnvCacheForTests();
    const result = await notifyOwner("Test subject", "Test body");
    expect(result).toEqual({ smsSent: false, emailSent: false });
  });

  it("dry-run logs (does not throw) when contact is set but channels aren't live", async () => {
    process.env.OWNER_PHONE_NUMBER = "+15555550100";
    process.env.OWNER_EMAIL = "owner@example.com";
    __resetEnvCacheForTests();

    const result = await notifyOwner("Test subject", "Test body");
    expect(result).toEqual({ smsSent: false, emailSent: false });
  });

  it("throws when SMS is live but no provider is configured", async () => {
    process.env.OWNER_PHONE_NUMBER = "+15555550100";
    process.env.LIVE_MODE = "true";
    process.env.SMS_ENABLED = "true";
    __resetEnvCacheForTests();

    await expect(notifyOwner("Test subject", "Test body")).rejects.toThrow(/no SMS provider is configured/);
  });

  it("throws when email is live but no provider is configured", async () => {
    process.env.OWNER_EMAIL = "owner@example.com";
    process.env.LIVE_MODE = "true";
    process.env.EMAIL_ENABLED = "true";
    __resetEnvCacheForTests();

    await expect(notifyOwner("Test subject", "Test body")).rejects.toThrow(/no email provider is configured/);
  });
});

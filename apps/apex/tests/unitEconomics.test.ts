import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@apex/db";
import { getRealizedUnitEconomics, suggestedMinimumPrice } from "@apex/spend";
import { resetDb, teardown } from "./helpers.js";

beforeEach(resetDb);
afterAll(teardown);

async function seedJob(agentId: string, cost: number, invoicePaid: boolean, revenue: number) {
  await prisma.dispatchJob.create({
    data: {
      source: "rebrand-engine",
      engine: "client-acquisition",
      stage: "queued",
      agentId,
      task: {},
      budgetCap: 1000,
      costToDate: cost,
      invoicePaid,
      revenueAttributed: revenue,
    },
  });
}

describe("getRealizedUnitEconomics", () => {
  it("is not eligible below the minimum closed-deal sample size (default 10)", async () => {
    for (let i = 0; i < 9; i++) {
      await seedJob(`agent-${i}`, 10, true, 100);
    }

    const result = await getRealizedUnitEconomics();
    expect(result.eligible).toBe(false);
    expect(result.closedDealCount).toBe(9);
    expect(result.avgRevenuePerClose).toBeNull();
    expect(result.avgCostPerClose).toBeNull();
    expect(result.realizedMarginPercent).toBeNull();
  });

  it("computes real blended cost-per-close once the sample size is met", async () => {
    // 10 closed deals at $100 revenue / $20 cost each, plus 5 unclosed
    // prospects that cost $10 each but never converted.
    for (let i = 0; i < 10; i++) {
      await seedJob(`closed-${i}`, 20, true, 100);
    }
    for (let i = 0; i < 5; i++) {
      await seedJob(`unclosed-${i}`, 10, false, 0);
    }

    const result = await getRealizedUnitEconomics();
    expect(result.eligible).toBe(true);
    expect(result.closedDealCount).toBe(10);
    expect(result.avgRevenuePerClose).toBe(100);
    // Blended: (10*20 + 5*10) / 10 closes = 250/10 = 25, NOT the naive $20
    // per-winning-job cost — includes what was spent on the 5 who said no.
    expect(result.avgCostPerClose).toBe(25);
    expect(result.realizedMarginPercent).toBe(75); // (100-25)/100
  });

  it("filters by engine when requested", async () => {
    for (let i = 0; i < 10; i++) {
      await prisma.dispatchJob.create({
        data: {
          source: "affiliate-agent",
          engine: "affiliate",
          stage: "queued",
          agentId: `aff-${i}`,
          task: {},
          budgetCap: 1000,
          costToDate: 5,
          invoicePaid: true,
          revenueAttributed: 50,
        },
      });
    }
    for (let i = 0; i < 10; i++) {
      await seedJob(`client-${i}`, 20, true, 100);
    }

    const affiliateOnly = await getRealizedUnitEconomics("affiliate");
    expect(affiliateOnly.avgRevenuePerClose).toBe(50);

    const clientOnly = await getRealizedUnitEconomics("client-acquisition");
    expect(clientOnly.avgRevenuePerClose).toBe(100);
  });
});

describe("suggestedMinimumPrice", () => {
  it("computes the price that yields the target margin on a given cost", () => {
    // $25 cost, 75% target margin -> price = 25 / (1 - 0.75) = 100
    expect(suggestedMinimumPrice(25, 75)).toBe(100);
    // $30 cost, 50% target margin -> price = 60
    expect(suggestedMinimumPrice(30, 50)).toBe(60);
  });

  it("rejects an impossible margin target", () => {
    expect(() => suggestedMinimumPrice(25, 100)).toThrow();
    expect(() => suggestedMinimumPrice(25, 150)).toThrow();
  });
});

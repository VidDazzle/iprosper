import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@apex/db";
import { getSocialProofStat, socialProofBullet } from "../src/index.js";
import { resetDb, teardown, createTestJob } from "./helpers.js";

beforeEach(resetDb);
afterAll(teardown);

describe("socialProofBullet", () => {
  it("returns null when not eligible", () => {
    expect(socialProofBullet({ closedClientCount: 3, eligible: false })).toBeNull();
  });

  it("formats a bullet with the real count when eligible", () => {
    expect(socialProofBullet({ closedClientCount: 12, eligible: true })).toBe(
      "12+ businesses like yours are already live on this",
    );
  });
});

describe("getSocialProofStat", () => {
  it("is not eligible below the minimum sample size (default 10)", async () => {
    for (let i = 0; i < 9; i++) {
      const job = await createTestJob();
      await prisma.dispatchJob.update({ where: { id: job.id }, data: { invoicePaid: true } });
    }

    const stat = await getSocialProofStat("client-acquisition");
    expect(stat.closedClientCount).toBe(9);
    expect(stat.eligible).toBe(false);
  });

  it("is eligible once the minimum sample size is reached", async () => {
    for (let i = 0; i < 10; i++) {
      const job = await createTestJob();
      await prisma.dispatchJob.update({ where: { id: job.id }, data: { invoicePaid: true } });
    }

    const stat = await getSocialProofStat("client-acquisition");
    expect(stat.closedClientCount).toBe(10);
    expect(stat.eligible).toBe(true);
  });

  it("only counts jobs that actually had an invoice paid", async () => {
    for (let i = 0; i < 10; i++) {
      await createTestJob(); // invoicePaid defaults to false
    }

    const stat = await getSocialProofStat("client-acquisition");
    expect(stat.closedClientCount).toBe(0);
    expect(stat.eligible).toBe(false);
  });

  it("only counts jobs on the requested engine", async () => {
    for (let i = 0; i < 10; i++) {
      const job = await createTestJob({ engine: "affiliate" });
      await prisma.dispatchJob.update({ where: { id: job.id }, data: { invoicePaid: true } });
    }

    const stat = await getSocialProofStat("client-acquisition");
    expect(stat.closedClientCount).toBe(0);
  });
});

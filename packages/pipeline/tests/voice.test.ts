import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@apex/db";
import { voice } from "../src/voice.js";
import { resetDb, teardown, createTestJob } from "./helpers.js";
import type { BrandKit } from "@apex/contracts";

beforeEach(resetDb);
afterAll(teardown);

const brandKit: BrandKit = { name: "Test Co", palette: [], fonts: [], services: ["A service"], reviews: [] };

describe("voice", () => {
  it("no-ops and touches nothing external while LIVE_MODE=false", async () => {
    const job = await createTestJob();
    await prisma.previewResult.create({
      data: { jobId: job.id, previewUrl: "https://example.com/preview", expiresAt: new Date() },
    });

    const result = await voice(job.id, brandKit);

    expect(result.live).toBe(false);
    expect(result.voiceAgentId).toBeNull();

    const row = await prisma.previewResult.findUniqueOrThrow({ where: { jobId: job.id } });
    expect(row.voiceAgentId).toBeNull();
  });
});

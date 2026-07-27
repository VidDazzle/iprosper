import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@apex/db";
import { ComplianceGateBlockedError } from "@apex/audit";
import { render } from "../src/render.js";
import { resetDb, teardown, createTestJob } from "./helpers.js";
import type { BrandKit, JobRequest } from "@apex/contracts";

beforeEach(resetDb);
afterAll(teardown);

const jobRequest: JobRequest = { url: "https://example.com", ip: "127.0.0.1", ts: new Date().toISOString() };

describe("render", () => {
  it("selects a template, persists BrandKit + PreviewResult, and returns a signed 24h URL", async () => {
    const job = await createTestJob();
    const brandKit: BrandKit = {
      name: "Sunrise Roofing",
      palette: ["#ff6600"],
      fonts: ["Roboto Slab"],
      services: ["Roof Repair", "Solar Installation"],
      reviews: [],
    };

    const result = await render(job.id, brandKit, jobRequest);

    expect(result.templateKey).toBe("built");
    expect(result.previewUrl).toContain(`/preview/${job.id}`);
    expect(result.previewUrl).toMatch(/[?&]sig=/);
    expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now() + 23 * 60 * 60 * 1000);

    const brandKitRow = await prisma.brandKit.findUniqueOrThrow({ where: { jobId: job.id } });
    expect(brandKitRow.name).toBe("Sunrise Roofing");

    const previewRow = await prisma.previewResult.findUniqueOrThrow({ where: { jobId: job.id } });
    expect(previewRow.watermarked).toBe(true);
  });

  it("blocks (throws) if the rendered content leaks PII not on the allowlist", async () => {
    const job = await createTestJob();
    const brandKit: BrandKit = {
      name: "Sunrise Roofing",
      palette: [],
      fonts: [],
      services: ["Roof Repair"],
      reviews: [{ text: "Call our tech directly at leaky-personal-email@gmail.com" }],
    };

    await expect(render(job.id, brandKit, jobRequest)).rejects.toBeInstanceOf(ComplianceGateBlockedError);
  });
});

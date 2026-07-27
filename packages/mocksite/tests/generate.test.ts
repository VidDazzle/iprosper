import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from "vitest";
import { prisma } from "@apex/db";
import { __resetEnvCacheForTests } from "@apex/config";
import { generateMockSiteHtml, buildGroundedPrompt, stripCodeFences } from "../src/index.js";
import { resetDb, teardown, createTestJob } from "./helpers.js";
import type { BrandKit } from "@apex/contracts";

beforeEach(resetDb);
afterAll(teardown);

const brandKit: BrandKit = {
  name: "Coastal Roofing Co",
  palette: ["#1e6b3d"],
  fonts: ["Poppins"],
  services: ["Roof Repair"],
  reviews: [],
};

describe("buildGroundedPrompt", () => {
  it("includes the real facts and forbids inventing content", () => {
    const prompt = buildGroundedPrompt(brandKit);
    expect(prompt).toContain("Coastal Roofing Co");
    expect(prompt).toContain("Roof Repair");
    expect(prompt).toContain("Do not invent");
    expect(prompt).toContain("do not invent any testimonials");
  });

  it("passes real reviews through verbatim instead of the no-reviews instruction", () => {
    const withReviews: BrandKit = { ...brandKit, reviews: [{ text: "Great service", author: "Jane" }] };
    const prompt = buildGroundedPrompt(withReviews);
    expect(prompt).toContain("Great service");
    expect(prompt).not.toContain("do not invent any testimonials");
  });
});

describe("stripCodeFences", () => {
  it("strips a markdown html code fence", () => {
    const fenced = "```html\n<!DOCTYPE html><html></html>\n```";
    expect(stripCodeFences(fenced)).toBe("<!DOCTYPE html><html></html>");
  });

  it("leaves unfenced output unchanged", () => {
    const raw = "<!DOCTYPE html><html></html>";
    expect(stripCodeFences(raw)).toBe(raw);
  });
});

describe("generateMockSiteHtml", () => {
  afterEach(() => {
    delete process.env.LIVE_MODE;
    delete process.env.GEMINI_SITE_ENABLED;
    delete process.env.GEMINI_API_KEY;
    __resetEnvCacheForTests();
    vi.unstubAllGlobals();
  });

  it("no-ops and touches nothing external while not live", async () => {
    const job = await createTestJob();
    const result = await generateMockSiteHtml(job.id, brandKit);

    expect(result.live).toBe(false);
    expect(result.html).toBeNull();

    const row = await prisma.mockSite.findUniqueOrThrow({ where: { jobId: job.id } });
    expect(row.generatedLive).toBe(false);
    expect(row.html).toBeNull();
  });

  it("calls Gemini, sanitizes the response, and persists it when live", async () => {
    process.env.LIVE_MODE = "true";
    process.env.GEMINI_SITE_ENABLED = "true";
    process.env.GEMINI_API_KEY = "test-key";
    __resetEnvCacheForTests();

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text:
                    "```html\n<html><body><h1>Coastal Roofing Co</h1><p>Roof Repair</p><script>evil()</script></body></html>\n```",
                },
              ],
            },
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const job = await createTestJob();
    const result = await generateMockSiteHtml(job.id, brandKit);

    expect(result.live).toBe(true);
    expect(result.html).toContain("Coastal Roofing Co");
    expect(result.html).not.toContain("<script");
    expect(result.groundingWarnings).toHaveLength(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toContain("generativelanguage.googleapis.com");

    const row = await prisma.mockSite.findUniqueOrThrow({ where: { jobId: job.id } });
    expect(row.generatedLive).toBe(true);
    expect(row.html).toContain("Coastal Roofing Co");
  });

  it("throws when Gemini returns a non-ok response", async () => {
    process.env.LIVE_MODE = "true";
    process.env.GEMINI_SITE_ENABLED = "true";
    process.env.GEMINI_API_KEY = "test-key";
    __resetEnvCacheForTests();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500, text: async () => "server error" }),
    );

    const job = await createTestJob();
    await expect(generateMockSiteHtml(job.id, brandKit)).rejects.toThrow(/Gemini generateContent failed/);
  });
});

import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from "vitest";
import { prisma } from "@apex/db";
import { __resetEnvCacheForTests } from "@apex/config";
import { deployMockSite } from "../src/index.js";
import { resetDb, teardown, createTestJob } from "./helpers.js";

beforeEach(resetDb);
afterAll(teardown);

const SAMPLE_HTML = "<!DOCTYPE html><html><body><h1>Coastal Roofing Co</h1></body></html>";

describe("deployMockSite", () => {
  afterEach(() => {
    delete process.env.LIVE_MODE;
    delete process.env.NETLIFY_DEPLOY_ENABLED;
    delete process.env.NETLIFY_API_KEY;
    delete process.env.NETLIFY_SITE_ID;
    __resetEnvCacheForTests();
    vi.unstubAllGlobals();
  });

  it("no-ops and deploys nothing publicly while not live", async () => {
    const job = await createTestJob();
    const result = await deployMockSite(job.id, SAMPLE_HTML);

    expect(result.live).toBe(false);
    expect(result.siteUrl).toBeNull();

    const row = await prisma.mockSite.findUniqueOrThrow({ where: { jobId: job.id } });
    expect(row.deployedLive).toBe(false);
    expect(row.siteUrl).toBeNull();
  });

  it("zips the html and deploys it to the configured Netlify site when live", async () => {
    process.env.LIVE_MODE = "true";
    process.env.NETLIFY_DEPLOY_ENABLED = "true";
    process.env.NETLIFY_API_KEY = "test-token";
    process.env.NETLIFY_SITE_ID = "test-site-id";
    __resetEnvCacheForTests();

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: "deploy-123",
        deploy_ssl_url: "https://deploy-123--test-site.netlify.app",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const job = await createTestJob();
    const result = await deployMockSite(job.id, SAMPLE_HTML);

    expect(result.live).toBe(true);
    expect(result.siteUrl).toBe("https://deploy-123--test-site.netlify.app");
    expect(result.deployId).toBe("deploy-123");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.netlify.com/api/v1/sites/test-site-id/deploys");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer test-token");
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/zip");
    expect(init.body).toBeInstanceOf(Uint8Array);

    const row = await prisma.mockSite.findUniqueOrThrow({ where: { jobId: job.id } });
    expect(row.deployedLive).toBe(true);
    expect(row.siteUrl).toBe("https://deploy-123--test-site.netlify.app");
    expect(row.deployId).toBe("deploy-123");
  });

  it("throws when Netlify returns a non-ok response", async () => {
    process.env.LIVE_MODE = "true";
    process.env.NETLIFY_DEPLOY_ENABLED = "true";
    process.env.NETLIFY_API_KEY = "test-token";
    process.env.NETLIFY_SITE_ID = "test-site-id";
    __resetEnvCacheForTests();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 401, text: async () => "unauthorized" }),
    );

    const job = await createTestJob();
    await expect(deployMockSite(job.id, SAMPLE_HTML)).rejects.toThrow(/Netlify deploy failed/);
  });
});

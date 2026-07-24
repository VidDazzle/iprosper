import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { scrape, ScrapeDisallowedError } from "../src/scrape.js";
import { startFixtureServer } from "./fixtureServer.js";

let server: Awaited<ReturnType<typeof startFixtureServer>>;

beforeAll(async () => {
  server = await startFixtureServer();
});
afterAll(async () => {
  await server.close();
});

describe("scrape", () => {
  it("fetches the homepage and linked public pages, respecting robots.txt", async () => {
    const result = await scrape(server.url + "/");
    const urls = result.pages.map((p) => p.url);

    expect(urls).toContain(server.url + "/");
    expect(urls).toContain(server.url + "/services");
    expect(urls).not.toContain(server.url + "/private");

    expect(result.provenance.robotsAllowed).toBe(true);
    expect(result.provenance.userAgent).toContain("ApexRebrandBot");
  });

  it("aborts entirely (throws) when the start URL itself is disallowed", async () => {
    await expect(scrape(server.url + "/private")).rejects.toBeInstanceOf(ScrapeDisallowedError);
  });
});

import { chromium } from "playwright";
import { fetchRobotsRuleset, isPathAllowed, SCRAPER_USER_AGENT } from "./robots.js";

const RATE_LIMIT_MS = 1000; // 1 req/sec, spec Section 4
const MAX_PAGES = 4; // homepage + up to 3 public pages, spec Section 4

export class ScrapeDisallowedError extends Error {
  constructor(url: string, reason: string) {
    super(`Scraping "${url}" is not permitted: ${reason}`);
    this.name = "ScrapeDisallowedError";
  }
}

export interface ScrapedPage {
  url: string;
  html: string;
  statusCode: number;
  fetchedAt: string;
}

export interface ScrapeResult {
  pages: ScrapedPage[];
  provenance: {
    userAgent: string;
    robotsAllowed: true; // scrape() throws before returning if disallowed
    startedAt: string;
    completedAt: string;
    urlsAttempted: string[];
  };
}

const LOGIN_PATH_HINTS = ["/login", "/signin", "/sign-in", "/account/login", "/wp-login.php"];

function looksLikeLoginWall(url: string): boolean {
  const path = new URL(url).pathname.toLowerCase();
  return LOGIN_PATH_HINTS.some((hint) => path.includes(hint));
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Homepage + up to 3 public pages, robots.txt-respecting, 1 req/sec,
 * identifying User-Agent, aborts on disallow, skips anything that looks
 * like a login wall (spec Section 1 & 4). Does not persist raw HTML to
 * Postgres — the caller (extract stage) consumes it in-memory; only
 * provenance metadata is meant to be persisted long-term.
 */
export async function scrape(startUrl: string): Promise<ScrapeResult> {
  const origin = new URL(startUrl).origin;
  const ruleset = await fetchRobotsRuleset(origin);

  if (ruleset === null) {
    throw new ScrapeDisallowedError(startUrl, "robots.txt could not be fetched or parsed — failing closed.");
  }
  if (!isPathAllowed(ruleset, new URL(startUrl).pathname)) {
    throw new ScrapeDisallowedError(startUrl, "disallowed by robots.txt");
  }

  const startedAt = new Date().toISOString();
  const browser = await chromium.launch({ headless: true });
  const pages: ScrapedPage[] = [];
  const urlsAttempted: string[] = [];

  try {
    const context = await browser.newContext({ userAgent: SCRAPER_USER_AGENT });
    const page = await context.newPage();

    const toVisit = [startUrl];
    const visited = new Set<string>();

    while (toVisit.length > 0 && pages.length < MAX_PAGES) {
      const url = toVisit.shift()!;
      if (visited.has(url)) continue;
      visited.add(url);

      if (new URL(url).origin !== origin) continue;
      if (looksLikeLoginWall(url)) continue;
      if (!isPathAllowed(ruleset, new URL(url).pathname)) continue;

      urlsAttempted.push(url);
      const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 }).catch(() => null);
      if (!response) continue;

      const finalUrl = page.url();
      if (looksLikeLoginWall(finalUrl)) continue; // redirected into a login wall

      const html = await page.content();
      pages.push({
        url,
        html,
        statusCode: response.status(),
        fetchedAt: new Date().toISOString(),
      });

      if (pages.length < MAX_PAGES) {
        const links = await page.$$eval("a[href]", (as) => as.map((a) => (a as HTMLAnchorElement).href));
        for (const link of links) {
          try {
            const linkUrl = new URL(link);
            if (linkUrl.origin === origin && !visited.has(linkUrl.href)) {
              toVisit.push(linkUrl.href);
            }
          } catch {
            // ignore malformed hrefs
          }
        }
      }

      if (toVisit.length > 0 && pages.length < MAX_PAGES) {
        await sleep(RATE_LIMIT_MS);
      }
    }
  } finally {
    await browser.close();
  }

  return {
    pages,
    provenance: {
      userAgent: SCRAPER_USER_AGENT,
      robotsAllowed: true,
      startedAt,
      completedAt: new Date().toISOString(),
      urlsAttempted,
    },
  };
}

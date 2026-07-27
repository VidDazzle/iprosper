export const SCRAPER_USER_AGENT = "ApexRebrandBot/1.0 (+https://viddazzle.com/apex-bot)";

interface RobotsRuleset {
  disallow: string[];
  allow: string[];
}

/**
 * Minimal robots.txt parser — supports User-agent/Disallow/Allow only
 * (no crawl-delay/sitemap parsing, not needed here). Matches our
 * identifying UA first, falls back to "*". Fails closed: if robots.txt
 * can't be fetched or parsed, scraping is NOT allowed by default
 * (spec Section 4: "robots.txt-respecting, abort if disallowed" — an
 * unreadable robots.txt is treated as a disallow, not a free pass).
 */
export async function fetchRobotsRuleset(origin: string): Promise<RobotsRuleset | null> {
  let res: Response;
  try {
    res = await fetch(new URL("/robots.txt", origin).toString(), {
      headers: { "User-Agent": SCRAPER_USER_AGENT },
    });
  } catch {
    return null;
  }
  if (!res.ok) {
    // No robots.txt at all is conventionally treated as "everything allowed."
    return res.status === 404 ? { disallow: [], allow: [] } : null;
  }

  const text = await res.text();
  return parseRobotsTxt(text);
}

export function parseRobotsTxt(text: string): RobotsRuleset {
  const lines = text.split(/\r?\n/).map((l) => l.trim());
  const groups: { agents: string[]; disallow: string[]; allow: string[] }[] = [];
  let current: { agents: string[]; disallow: string[]; allow: string[] } | null = null;

  for (const rawLine of lines) {
    const line = rawLine.split("#")[0].trim();
    if (!line) continue;
    const [rawKey, ...rest] = line.split(":");
    const key = rawKey.trim().toLowerCase();
    const value = rest.join(":").trim();

    if (key === "user-agent") {
      if (!current || current.disallow.length > 0 || current.allow.length > 0) {
        current = { agents: [value], disallow: [], allow: [] };
        groups.push(current);
      } else {
        current.agents.push(value);
      }
    } else if (key === "disallow" && current) {
      if (value) current.disallow.push(value);
    } else if (key === "allow" && current) {
      if (value) current.allow.push(value);
    }
  }

  const ourAgent = SCRAPER_USER_AGENT.split("/")[0].toLowerCase();
  const specific = groups.find((g) => g.agents.some((a) => a.toLowerCase() === ourAgent));
  const wildcard = groups.find((g) => g.agents.some((a) => a === "*"));
  const chosen = specific ?? wildcard;

  return { disallow: chosen?.disallow ?? [], allow: chosen?.allow ?? [] };
}

export function isPathAllowed(ruleset: RobotsRuleset, path: string): boolean {
  const disallowMatch = ruleset.disallow.find((rule) => path.startsWith(rule));
  if (!disallowMatch) return true;

  const allowMatch = ruleset.allow.find((rule) => path.startsWith(rule) && rule.length > disallowMatch.length);
  return Boolean(allowMatch);
}

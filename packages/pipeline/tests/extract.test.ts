import { describe, it, expect } from "vitest";
import { extractBrandKit } from "../src/extract.js";
import type { ScrapedPage } from "../src/scrape.js";

function page(html: string, url = "https://example-business.com"): ScrapedPage {
  return { url, html, statusCode: 200, fetchedAt: new Date().toISOString() };
}

describe("extractBrandKit", () => {
  it("extracts title, headings, palette, fonts, and logo", () => {
    const html = `
      <html><head><title>Sunrise Roofing | Best in Town</title>
      <style>.hero { color: #ff6600; font-family: 'Roboto Slab', serif; }</style>
      </head>
      <body>
        <img src="/img/sunrise-logo.png" alt="Sunrise Roofing logo" class="logo">
        <h1>Roof Repair</h1>
        <h2>Solar Installation</h2>
        <h2>Emergency Tarping</h2>
      </body></html>
    `;
    const kit = extractBrandKit(undefined, [page(html)]);

    expect(kit.name).toBe("Sunrise Roofing");
    expect(kit.services).toEqual(expect.arrayContaining(["Roof Repair", "Solar Installation", "Emergency Tarping"]));
    expect(kit.palette).toContain("#ff6600");
    expect(kit.fonts).toContain("Roboto Slab");
    expect(kit.logoUrl).toBe("https://example-business.com/img/sunrise-logo.png");
  });

  it("prefers the given business name over the scraped title", () => {
    const kit = extractBrandKit("Explicit Name Co", [page("<title>Something Else</title>")]);
    expect(kit.name).toBe("Explicit Name Co");
  });

  it("never fabricates reviews from freeform text — only structured schema.org markup counts", () => {
    const html = `<p>"Best service ever!" - Jane D.</p>`; // looks like a testimonial but isn't structured
    const kit = extractBrandKit(undefined, [page(html)]);
    expect(kit.reviews).toEqual([]);
  });

  it("extracts reviews from schema.org JSON-LD", () => {
    const html = `
      <script type="application/ld+json">
      {"@type":"Review","author":{"name":"Jane D."},"reviewRating":{"ratingValue":5},"reviewBody":"Best service ever!"}
      </script>
    `;
    const kit = extractBrandKit(undefined, [page(html)]);
    expect(kit.reviews).toHaveLength(1);
    expect(kit.reviews[0]).toMatchObject({ author: "Jane D.", rating: 5, text: "Best service ever!" });
  });

  it("handles empty/thin pages without throwing", () => {
    const kit = extractBrandKit(undefined, []);
    expect(kit.name).toBe("Unknown Business");
    expect(kit.services).toEqual([]);
    expect(kit.reviews).toEqual([]);
  });
});

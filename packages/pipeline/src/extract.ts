import type { BrandKit } from "@apex/contracts";
import type { ScrapedPage } from "./scrape.js";

/**
 * Heuristic, regex/string-based BrandKit extraction from raw scraped
 * HTML — no LLM call. Deliberately conservative: reviews are only
 * populated from markup that unambiguously identifies itself as a
 * review (schema.org Review/AggregateRating), never guessed or
 * paraphrased from generic page text — fabricating testimonials would
 * be actively dishonest content, not a shortcut worth taking.
 *
 * An LLM-assisted pass (via ANTHROPIC_API_KEY) would improve name/tone/
 * service extraction quality, but scraped HTML is untrusted input —
 * anything fed to a model here must be treated as data, never as
 * instructions, and that integration isn't wired in this phase.
 */
export function extractBrandKit(businessName: string | undefined, pages: ScrapedPage[]): BrandKit {
  const combinedHtml = pages.map((p) => p.html).join("\n");
  const homepage = pages[0];

  const name = businessName ?? extractTitle(homepage?.html ?? "") ?? "Unknown Business";
  const services = extractHeadings(combinedHtml);
  const palette = extractPalette(combinedHtml);
  const fonts = extractFonts(combinedHtml);
  const logoUrl = extractLogoUrl(homepage?.html ?? "", homepage?.url);
  const reviews = extractStructuredReviews(combinedHtml);

  return { name, palette, fonts, logoUrl, services, reviews };
}

function extractTitle(html: string): string | undefined {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (!match) return undefined;
  // strip common " | Site Name" / " - Site Name" suffixes
  return match[1].split(/[|\-–]/)[0].trim() || undefined;
}

function extractHeadings(html: string): string[] {
  const matches = [...html.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi)];
  const texts = matches
    .map((m) => stripTags(m[1]).trim())
    .filter((t) => t.length > 2 && t.length < 80);
  return Array.from(new Set(texts)).slice(0, 10);
}

function extractPalette(html: string): string[] {
  const matches = [...html.matchAll(/#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g)].map((m) => m[0].toLowerCase());
  const counts = new Map<string, number>();
  for (const color of matches) {
    if (color === "#fff" || color === "#ffffff" || color === "#000" || color === "#000000") continue;
    counts.set(color, (counts.get(color) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([color]) => color);
}

function extractFonts(html: string): string[] {
  // Capture group must allow quote characters through (font names are
  // often quoted, e.g. font-family: 'Roboto Slab', serif) — they're
  // stripped afterward, not excluded from matching in the first place.
  const matches = [...html.matchAll(/font-family\s*:\s*([^;}]+)/gi)];
  const fonts = new Set<string>();
  for (const m of matches) {
    const first = m[1].split(",")[0].replace(/['"]/g, "").trim();
    if (first && !/^(inherit|initial|unset)$/i.test(first)) fonts.add(first);
  }
  return Array.from(fonts).slice(0, 3);
}

function extractLogoUrl(html: string, baseUrl?: string): string | undefined {
  const imgMatches = [...html.matchAll(/<img[^>]+>/gi)];
  for (const m of imgMatches) {
    const tag = m[0];
    if (/logo/i.test(tag)) {
      const src = tag.match(/src=["']([^"']+)["']/i)?.[1];
      if (src) {
        try {
          return baseUrl ? new URL(src, baseUrl).toString() : src;
        } catch {
          return undefined;
        }
      }
    }
  }
  return undefined;
}

function extractStructuredReviews(html: string): Record<string, unknown>[] {
  // Only schema.org Review microdata/JSON-LD counts as "found," never freeform text guessing.
  const jsonLdBlocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const reviews: Record<string, unknown>[] = [];

  for (const block of jsonLdBlocks) {
    try {
      const data = JSON.parse(block[1]);
      const entries = Array.isArray(data) ? data : [data];
      for (const entry of entries) {
        if (entry["@type"] === "Review" || entry.review) {
          const found = entry["@type"] === "Review" ? [entry] : [].concat(entry.review);
          for (const r of found) {
            reviews.push({
              author: r.author?.name ?? r.author ?? "Anonymous",
              rating: r.reviewRating?.ratingValue,
              text: r.reviewBody,
              source: "schema.org",
            });
          }
        }
      }
    } catch {
      // malformed JSON-LD — skip rather than guess
    }
  }

  return reviews.slice(0, 5);
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
}

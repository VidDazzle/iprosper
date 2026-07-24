import type { ContentBrief } from "../config/types.js";

/**
 * SEO metadata itself is generated in-line by the script writer (one LLM call
 * covers creative + keywords together, since they need to agree). This module
 * assembles that metadata into what each platform actually wants at post
 * time, and fills safe fallbacks if the model omitted a field.
 */

export function ensureSeoDefaults(brief: ContentBrief): ContentBrief {
  return {
    ...brief,
    seoTitle: brief.seoTitle?.trim() || brief.topic.slice(0, 70),
    seoDescription: brief.seoDescription?.trim() || brief.caption.slice(0, 160),
    seoKeywords: brief.seoKeywords?.length ? brief.seoKeywords : deriveKeywordsFromHashtags(brief.hashtags),
    altText: brief.altText?.trim() || `${brief.topic} — ${brief.hook}`.slice(0, 125),
  };
}

function deriveKeywordsFromHashtags(hashtags: string[]): string[] {
  return hashtags.map((h) => h.replace(/^#/, "").replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase());
}

/** Keyword-optimized long-form description, for platforms that show one (YouTube, Pinterest, Facebook). */
export function buildSeoDescription(brief: ContentBrief, extra?: string): string {
  const parts = [
    brief.seoDescription,
    brief.caption,
    extra,
    brief.seoKeywords?.length ? brief.seoKeywords.map((k) => `#${k.replace(/\s+/g, "")}`).join(" ") : undefined,
  ].filter(Boolean);
  return parts.join("\n\n");
}

/** Short, keyword-rich title for platforms with a discrete title field. */
export function buildSeoTitle(brief: ContentBrief): string {
  return (brief.seoTitle || brief.topic).slice(0, 100);
}

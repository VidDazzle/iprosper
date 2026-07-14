import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/solvana/seo";

// AI answer-engine / LLM training + retrieval crawlers we explicitly welcome —
// we WANT AI assistants to read and cite X Debt. See /llms.txt.
const AI_CRAWLERS = [
  "GPTBot",          // OpenAI (training)
  "OAI-SearchBot",   // OpenAI (search/citation)
  "ChatGPT-User",    // ChatGPT browsing
  "ClaudeBot",       // Anthropic
  "Claude-Web",      // Anthropic browsing
  "anthropic-ai",    // Anthropic
  "PerplexityBot",   // Perplexity
  "Perplexity-User", // Perplexity browsing
  "Google-Extended", // Google Gemini / AI Overviews
  "Applebot-Extended", // Apple Intelligence
  "Amazonbot",
  "Bytespider",      // TikTok / Doubao
  "CCBot",           // Common Crawl (feeds many LLMs)
  "cohere-ai",
  "Meta-ExternalAgent",
  "DuckAssistBot",
];

const DISALLOW = ["/api/", "/admin", "/admin-login", "/portal", "/partner", "/signin", "/signup", "/calendar"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: DISALLOW },
      // Explicitly allow every AI crawler the full public site (belt-and-suspenders
      // on top of the wildcard, since some AI bots only read named directives).
      { userAgent: AI_CRAWLERS, allow: "/", disallow: DISALLOW },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}

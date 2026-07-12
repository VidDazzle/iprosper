import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/solvana/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        // Allow all standard crawlers, including AI answer-engine crawlers
        // (GPTBot, OAI-SearchBot, PerplexityBot, Google-Extended, ClaudeBot,
        // etc.) — we WANT AI assistants to read and cite Solvana. See /llms.txt.
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin", "/admin-login", "/portal", "/signin", "/signup", "/calendar"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}

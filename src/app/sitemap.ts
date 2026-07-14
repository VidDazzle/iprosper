import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/solvana/seo";
import { locationSitemapUrls } from "@/lib/geo";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes: Array<{ path: string; priority: number; freq: MetadataRoute.Sitemap[number]["changeFrequency"] }> = [
    { path: "/", priority: 1.0, freq: "weekly" },
    { path: "/advisor", priority: 1.0, freq: "weekly" },
    { path: "/law-and-armor", priority: 1.0, freq: "weekly" },
    { path: "/medical-billing", priority: 1.0, freq: "weekly" },
    { path: "/find-an-attorney", priority: 0.8, freq: "weekly" },
    { path: "/attorneys", priority: 0.7, freq: "monthly" },
    { path: "/how-it-works", priority: 0.9, freq: "monthly" },
    { path: "/agents", priority: 0.9, freq: "monthly" },
    { path: "/pricing", priority: 0.8, freq: "monthly" },
    { path: "/qualify", priority: 0.9, freq: "weekly" },
    { path: "/get-started", priority: 0.9, freq: "weekly" },
    { path: "/legal/disclosures", priority: 0.5, freq: "yearly" },
    { path: "/legal/advocate-disclosure", priority: 0.5, freq: "yearly" },
    { path: "/legal/terms", priority: 0.4, freq: "yearly" },
    { path: "/legal/privacy", priority: 0.4, freq: "yearly" },
    { path: "/legal/licensing", priority: 0.5, freq: "yearly" },
  ];

  const core = routes.map((r) => ({
    url: `${SITE_URL}${r.path}`,
    lastModified: now,
    changeFrequency: r.freq,
    priority: r.priority,
  }));

  // Local-SEO location tree (states, counties, cities). Well under the 50,000-URL
  // per-sitemap limit even at full national coverage; switch to generateSitemaps
  // chunking if the dataset grows past that.
  const locations: MetadataRoute.Sitemap = locationSitemapUrls().map((u) => ({
    url: `${SITE_URL}${u.path}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: u.priority,
  }));

  return [...core, ...locations];
}

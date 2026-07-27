import { prisma } from "@apex/db";
import { loadEnv, isMockSiteGenerationLive } from "@apex/config";
import type { BrandKit } from "@apex/contracts";
import { sanitizeMockSiteHtml } from "./sanitize.js";
import { checkGrounding } from "./grounding.js";

export interface MockSiteGenerationResult {
  html: string | null;
  live: boolean;
  groundingWarnings: string[];
}

/**
 * Every fact given to Gemini here is real, already-extracted BrandKit
 * data — nothing invented gets into the prompt, and the prompt itself
 * explicitly forbids inventing anything beyond it (spec-adjacent, per
 * conversation: "constrained to real extracted BrandKit facts only").
 */
export function buildGroundedPrompt(brandKit: BrandKit): string {
  const facts = [
    `Business name: ${brandKit.name}`,
    `Services offered: ${brandKit.services.length > 0 ? brandKit.services.join(", ") : "not specified — do not invent specific services"}`,
    `Brand colors (hex): ${brandKit.palette.length > 0 ? brandKit.palette.join(", ") : "not specified — choose a professional, neutral palette"}`,
    `Fonts: ${brandKit.fonts.length > 0 ? brandKit.fonts.join(", ") : "not specified — choose clean, modern web-safe fonts"}`,
    brandKit.logoUrl ? `Logo URL: ${brandKit.logoUrl}` : null,
    brandKit.reviews.length > 0
      ? `Real customer reviews (quote verbatim if used, do not alter or invent additional ones): ${JSON.stringify(brandKit.reviews)}`
      : `No real reviews were found — do not invent any testimonials, quotes, or star ratings.`,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");

  return [
    `You are generating a single-file HTML mock website redesign for a real local business, to be shown to that business's owner as a sales preview.`,
    ``,
    `CRITICAL RULES — violating any of these makes the output unusable:`,
    `1. Use ONLY the facts listed below. Do not invent testimonials, reviews, star ratings, pricing, certifications, awards, statistics, years in business, or any other specific claim not given to you.`,
    `2. If a fact below is missing (e.g. no reviews were provided), either omit that section or use clearly generic, non-specific language — never fabricate a specific-sounding detail to fill the gap.`,
    `3. Do not disparage the business's current site or claim anything about its performance (traffic, conversions, rankings) — nothing has been measured.`,
    `4. Output a SINGLE self-contained HTML file: inline <style> only, no external stylesheets, no <script> tags, no remote font/analytics/tracking requests.`,
    `5. Make it visually polished and modern — a premium redesign, not a generic template.`,
    ``,
    `REAL FACTS (the only source of truth for this business):`,
    facts,
    ``,
    `Output ONLY the raw HTML, starting with <!DOCTYPE html>. No markdown code fences, no commentary before or after.`,
  ].join("\n");
}

/** Gemini sometimes wraps output in a markdown code fence despite being told not to — strip it if present. */
export function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:html)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : trimmed;
}

/**
 * Generates a single-file mock-site HTML for one job. Gated on
 * isMockSiteGenerationLive() (LIVE_MODE + GEMINI_SITE_ENABLED) AND a
 * real GEMINI_API_KEY — in dry-run/unconfigured, returns
 * {html: null, live: false} and touches nothing external, so no real
 * Gemini spend happens while developing/testing. NOT verified against
 * a live Gemini API in this build — the request shape below is
 * best-effort from Google's documented generateContent REST API and
 * needs a real smoke test before this stage is trusted live.
 */
export async function generateMockSiteHtml(jobId: string, brandKit: BrandKit): Promise<MockSiteGenerationResult> {
  const env = loadEnv();

  if (!isMockSiteGenerationLive() || !env.GEMINI_API_KEY) {
    await prisma.mockSite.upsert({
      where: { jobId },
      update: { html: null, generatedLive: false, groundingWarnings: [] },
      create: { jobId, html: null, generatedLive: false, groundingWarnings: [] },
    });
    return { html: null, live: false, groundingWarnings: [] };
  }

  const prompt = buildGroundedPrompt(brandKit);
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    },
  );

  if (!res.ok) {
    throw new Error(`Gemini generateContent failed: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) {
    throw new Error("Gemini generateContent returned no text content.");
  }

  const html = sanitizeMockSiteHtml(stripCodeFences(rawText));
  const groundingWarnings = checkGrounding(html, brandKit);

  await prisma.mockSite.upsert({
    where: { jobId },
    update: { html, generatedLive: true, groundingWarnings },
    create: { jobId, html, generatedLive: true, groundingWarnings },
  });

  return { html, live: true, groundingWarnings };
}

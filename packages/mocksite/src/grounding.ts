import type { BrandKit } from "@apex/contracts";

/**
 * Best-effort structural check, NOT a hallucination detector — there
 * is no reliable way to prove an LLM didn't invent a small claim
 * (a stat, a certification, a price) just by scanning its output.
 * Real grounding is enforced upstream, in the prompt itself: only
 * real BrandKit facts are given to Gemini, with an explicit
 * instruction not to invent anything beyond them (see generate.ts).
 * This just catches the more common and more severe failure — a
 * generic or off-target generation that doesn't even reference the
 * real business — so it can be flagged for human review rather than
 * silently sent out.
 */
export function checkGrounding(html: string, brandKit: BrandKit): string[] {
  const warnings: string[] = [];
  const lower = html.toLowerCase();

  if (!lower.includes(brandKit.name.toLowerCase())) {
    warnings.push(`Generated site does not mention the business name "${brandKit.name}".`);
  }

  for (const service of brandKit.services) {
    if (!lower.includes(service.toLowerCase())) {
      warnings.push(`Generated site does not mention service "${service}".`);
    }
  }

  return warnings;
}

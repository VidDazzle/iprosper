import type { BrandKit } from "@apex/contracts";

export type TemplateKey = "luxe" | "built" | "destination";

const KEYWORDS: Record<TemplateKey, string[]> = {
  luxe: ["med spa", "medspa", "aesthetic", "plastic surgery", "skincare", "botox", "dermatology", "wellness spa"],
  built: ["roofing", "solar", "construction", "hvac", "plumbing", "contractor", "home service", "remodel"],
  destination: ["real estate", "realty", "resort", "hotel", "hospitality", "vacation rental", "property"],
};

export class UnknownVerticalError extends Error {
  constructor(businessName: string) {
    super(
      `Could not determine a house template for "${businessName}" — no explicit vertical given and no keyword match. Needs human classification rather than a guessed default (wrong tone/template reads as unprofessional).`,
    );
    this.name = "UnknownVerticalError";
  }
}

/**
 * Explicit vertical (set earlier in the pipeline) always wins. Absent
 * that, this scores keyword hits across the brand's name/services and
 * picks the best match. If nothing matches, it fails closed rather than
 * defaulting to an arbitrary template — the wrong tone (e.g. LUXE copy
 * on a roofing company) is a worse outcome than a queued manual review.
 */
export function selectTemplate(brandKit: BrandKit, explicitVertical?: TemplateKey): TemplateKey {
  if (explicitVertical) return explicitVertical;

  const haystack = `${brandKit.name} ${brandKit.services.join(" ")}`.toLowerCase();

  let best: { key: TemplateKey; hits: number } | undefined;
  for (const key of Object.keys(KEYWORDS) as TemplateKey[]) {
    const hits = KEYWORDS[key].filter((kw) => haystack.includes(kw)).length;
    if (hits > 0 && (!best || hits > best.hits)) {
      best = { key, hits };
    }
  }

  if (!best) throw new UnknownVerticalError(brandKit.name);
  return best.key;
}

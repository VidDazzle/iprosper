/**
 * Paid acquisition framework — the debt-relief ad campaigns Solvana runs
 * across social and search to capture inquiries.
 *
 * Debt relief advertising is heavily regulated. Every creative here is written
 * to the FTC Telemarketing Sales Rule and UDAAP standards: no guaranteed
 * outcomes, no "government program" implication, no "reduce debt by X%" without
 * material qualifiers, and the required disclaimer travels with every ad. These
 * definitions double as the brief handed to creative/video tools and as the
 * campaign taxonomy that populates utm_* parameters on each ad's landing URL.
 */

export type AdPlatform =
  | "meta" // Facebook + Instagram
  | "tiktok"
  | "youtube"
  | "google" // Search + Performance Max
  | "x"
  | "linkedin";

export type AdFormat = "video" | "image" | "carousel" | "search" | "short";

/** The disclaimer that MUST accompany every debt-relief ad (Sentinel-approved). */
export const AD_DISCLAIMER =
  "Solvana negotiates settlements of unsecured debt; it does not lend money or pay creditors directly. Enrollment requires $7,500+ in qualifying unsecured debt. Programs typically take 24–36 months. Fees (15–25% of enrolled debt) are charged only after a debt is settled. Stopping payments may hurt your credit and lead to collections or lawsuits. Creditors are not required to accept settlements. Results vary and are not guaranteed. Not available in all states.";

export interface AdCreative {
  format: AdFormat;
  hook: string; // first 3 seconds / headline
  primaryText: string;
  cta: string;
  /** Brief for AI video/image generation of the commercial. */
  visualBrief: string;
}

export interface Campaign {
  id: string;
  platform: AdPlatform;
  objective: "lead_gen" | "conversions" | "video_views" | "traffic";
  audience: string;
  landingPath: string; // where the ad points (before utm params)
  creatives: AdCreative[];
}

/** Build the fully-attributed landing URL for a given campaign + creative. */
export function adLandingUrl(base: string, c: Campaign, creativeIndex = 0): string {
  const mediumByPlatform: Record<AdPlatform, string> = {
    meta: "paid_social",
    tiktok: "paid_social",
    youtube: "video",
    google: "cpc",
    x: "paid_social",
    linkedin: "paid_social",
  };
  const params = new URLSearchParams({
    utm_source: c.platform,
    utm_medium: mediumByPlatform[c.platform],
    utm_campaign: c.id,
    utm_content: `${c.id}__creative_${creativeIndex + 1}`,
  });
  return `${base}${c.landingPath}?${params.toString()}`;
}

export const CAMPAIGNS: Campaign[] = [
  {
    id: "meta_creditcard_relief_2026q3",
    platform: "meta",
    objective: "lead_gen",
    audience:
      "US adults 30–60, interests: credit cards, personal finance, budgeting; lookalikes of enrolled clients; excludes existing clients.",
    landingPath: "/get-started",
    creatives: [
      {
        format: "video",
        hook: "Buried in credit card debt? An AI just negotiated someone's $28,000 balance down.",
        primaryText:
          "Solvana's AI agents negotiate with your creditors to settle unsecured debt for less than you owe — credit cards, medical bills, personal loans. No upfront fees; you only pay when a debt settles. See if you qualify in 2 minutes.",
        cta: "Check eligibility",
        visualBrief:
          "Futuristic dark UI with cyan/violet glow; a calm AI voice-agent waveform; on-screen counter dropping from $28,000 to $12,600; real-person relief, not stock celebration. Include on-screen disclaimer.",
      },
      {
        format: "carousel",
        hook: "3 steps to owe less.",
        primaryText:
          "1) Stop payments, save into an FDIC-insured account you control. 2) Our AI negotiates a lump-sum settlement. 3) The rest is forgiven. Zero upfront fees.",
        cta: "Learn more",
        visualBrief:
          "Three neon cards mirroring the site's how-it-works section; each card one step; consistent cyan→violet gradient.",
      },
    ],
  },
  {
    id: "tiktok_debtfree_journey_2026q3",
    platform: "tiktok",
    objective: "conversions",
    audience: "US 25–45, #debtfreejourney / #paycheckToPaycheck engagers; broad interest expansion.",
    landingPath: "/get-started",
    creatives: [
      {
        format: "short",
        hook: "POV: an AI is on the phone settling your credit card debt while you sleep.",
        primaryText:
          "No upfront fees. You only pay when a debt actually settles. Tap to see if $7,500+ in card, medical, or loan debt qualifies.",
        cta: "See if you qualify",
        visualBrief:
          "Vertical 9:16, fast cuts, UGC-style talking head + screen recording of the Solvana voice-agent waveform negotiating; captions burned in; disclaimer on final frame.",
      },
    ],
  },
  {
    id: "youtube_how_settlement_works_2026q3",
    platform: "youtube",
    objective: "video_views",
    audience: "In-market for debt relief / consolidation; custom intent from finance search terms.",
    landingPath: "/how-it-works",
    creatives: [
      {
        format: "video",
        hook: "Debt settlement, explained honestly — including what it does to your credit.",
        primaryText:
          "A 60-second explainer: how stopping payments, saving into an account you control, and AI negotiation actually work — and the real trade-offs. Then decide.",
        cta: "Watch & check eligibility",
        visualBrief:
          "Clean explainer with the nine AI agents as animated icons; honest tone; show pros AND cons on screen; end card with disclaimer + qualify button.",
      },
    ],
  },
  {
    id: "google_search_debt_relief_2026q3",
    platform: "google",
    objective: "lead_gen",
    audience:
      "Search terms: 'debt settlement companies', 'settle credit card debt', 'debt relief no upfront fee', 'medical bill negotiation'. Negative: 'free', 'nonprofit', 'bankruptcy attorney'.",
    landingPath: "/get-started",
    creatives: [
      {
        format: "search",
        hook: "AI Debt Settlement — No Upfront Fees",
        primaryText:
          "Settle credit cards, medical bills & loans for less. Pay only when a debt settles. $7,500+ debt. See if you qualify free.",
        cta: "Check My Eligibility",
        visualBrief: "Responsive search ad; sitelinks to How It Works, Fees, Disclosures.",
      },
    ],
  },
  {
    id: "linkedin_business_debt_2026q3",
    platform: "linkedin",
    objective: "lead_gen",
    audience: "Small-business owners, sole proprietors; company size 1–20; US.",
    landingPath: "/get-started",
    creatives: [
      {
        format: "image",
        hook: "Unsecured business debt weighing on your company?",
        primaryText:
          "Solvana's AI negotiates settlements on qualifying unsecured business debt — no upfront fees, you pay only when a debt settles. Confidential eligibility check.",
        cta: "See if you qualify",
        visualBrief:
          "Professional dark-mode single image; restrained neon accent; founder-at-desk tone; disclaimer footer.",
      },
    ],
  },
  {
    id: "x_ai_negotiator_2026q3",
    platform: "x",
    objective: "traffic",
    audience: "Followers of personal-finance and fintech accounts; US 25–55.",
    landingPath: "/agents",
    creatives: [
      {
        format: "video",
        hook: "We built 9 AI agents that do nothing but get your debt forgiven.",
        primaryText:
          "Meet the workforce: intake, analysis, negotiation, compliance — all AI, all voice, 24/7. No upfront fees.",
        cta: "Meet the agents",
        visualBrief:
          "Sizzle reel of the agent grid; each agent name + specialty; cyan/violet; disclaimer end card.",
      },
    ],
  },
];

export function campaignsByPlatform(platform: AdPlatform): Campaign[] {
  return CAMPAIGNS.filter((c) => c.platform === platform);
}

/**
 * Attorney advertising — pricing and the legal rules that shape it.
 *
 * LEGAL BASIS (enforced, not optional):
 * - ABA Model Rule 5.4(a): a lawyer may not share legal fees with a non-lawyer.
 *   => We can NEVER charge a percentage of what an attorney bills a client.
 * - ABA Model Rule 7.2(b): a lawyer may not give anything of value for a
 *   recommendation, EXCEPT the reasonable cost of advertising and permitted
 *   lead-generator/referral-service arrangements that don't recommend a
 *   specific lawyer, aren't exclusive, and disclose they're paid.
 *   => We charge flat ADVERTISING fees, not referral fees for referrals.
 *
 * So X Debt monetizes attorney advertising three compliant ways:
 *   1) One-time setup/onboarding fee (advertising production).
 *   2) Flat monthly advertising subscription (placement).
 *   3) Flat per-qualified-lead advertising fee — a FIXED dollar amount per
 *      verified connection (call/text/notification), the same whether or not
 *      the client ever retains the attorney and regardless of the fee charged.
 * The percentage-of-fee and pay-for-referral models are represented here only
 * so the platform can refuse them.
 */

export type Tier = "listed" | "featured" | "spotlight";

export interface TierPlan {
  id: Tier;
  name: string;
  monthly: number;
  practiceAreas: number; // how many debt/bankruptcy categories they can appear in
  perLeadFee: number; // flat advertising fee per verified lead
  placement: string;
  perks: string[];
  highlighted?: boolean;
}

export const SETUP_FEE = 499; // one-time: onboarding + AI-designed profile & business card

/** Optional booking-calendar add-on (Chronos): a flat monthly fee plus a flat
 *  fee per booked consultation. Both are flat advertising fees — never a share
 *  of legal fees or a referral fee. */
export const CALENDAR_ADDON = {
  monthly: 79,
  perAppointment: 40,
} as const;

export const TIERS: TierPlan[] = [
  {
    id: "listed",
    name: "Listed",
    monthly: 99,
    practiceAreas: 1,
    perLeadFee: 45,
    placement: "Standard placement in the attorney directory",
    perks: [
      "Directory listing in 1 practice area",
      "Photo, bio & contact details",
      "AI-designed digital business card",
      "Verified-lead reporting dashboard",
    ],
  },
  {
    id: "featured",
    name: "Featured",
    monthly: 299,
    practiceAreas: 3,
    perLeadFee: 65,
    placement: "Priority placement above Listed attorneys",
    highlighted: true,
    perks: [
      "Everything in Listed",
      "Priority placement in up to 3 practice areas",
      "“Featured” badge",
      "Placement in the free Debt Advisor results",
      "Call, text & notification lead routing",
    ],
  },
  {
    id: "spotlight",
    name: "Spotlight",
    monthly: 599,
    practiceAreas: 99,
    perLeadFee: 85,
    placement: "Top placement across every practice area",
    perks: [
      "Everything in Featured",
      "Top placement across all debt types + bankruptcy",
      "Homepage & advisor spotlight",
      "First-priority lead routing in your state",
      "Quarterly performance review with Beacon",
    ],
  },
];

export function getTier(id: Tier): TierPlan {
  return TIERS.find((t) => t.id === id) ?? TIERS[0];
}

/** Practice areas an attorney can select. */
export const PRACTICE_AREAS = [
  "Credit card debt",
  "Medical debt",
  "Personal loans",
  "Auto loan / repossession",
  "Mortgage / foreclosure",
  "Student loans",
  "Debt collection defense (FDCPA)",
  "Chapter 7 bankruptcy",
  "Chapter 13 bankruptcy",
  "Business debt",
] as const;

/** Lead-billing model. Only "per_lead" (flat advertising fee) is allowed. */
export type LeadBillingModel = "per_lead" | "percentage_of_fee" | "referral_fee";

export interface LeadBillingRuling {
  allowed: boolean;
  model: LeadBillingModel;
  reason: string;
}

/**
 * Compliance gate for how a lead may be billed. The platform ONLY permits a
 * flat per-lead advertising fee. Percentage-of-fee is fee-splitting (Rule 5.4);
 * a referral fee for a referral is barred by Rule 7.2(b). Both are refused.
 */
export function evaluateLeadBilling(model: LeadBillingModel): LeadBillingRuling {
  switch (model) {
    case "per_lead":
      return {
        allowed: true,
        model,
        reason:
          "Flat per-lead advertising fee — a fixed amount per verified connection, not contingent on the client retaining the attorney or on the attorney's fee. Permitted as a reasonable advertising cost (Rule 7.2(b)).",
      };
    case "percentage_of_fee":
      return {
        allowed: false,
        model,
        reason:
          "Charging a percentage of the attorney's fee is fee-splitting with a non-lawyer, prohibited by ABA Model Rule 5.4(a) in essentially every U.S. jurisdiction. Refused — billed as a flat per-lead advertising fee instead.",
      };
    case "referral_fee":
      return {
        allowed: false,
        model,
        reason:
          "A fee paid for referring a specific client is prohibited by ABA Model Rule 7.2(b). Refused — billed as a flat per-lead advertising fee instead.",
      };
  }
}

export const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

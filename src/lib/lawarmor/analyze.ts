/**
 * Law & Armor analysis engine. Produces an educational, plain-English report
 * that helps a consumer understand a document and the rights that may apply.
 *
 * This is NOT legal advice. Content is framed as points to understand and
 * questions to ask — never as a recommendation or legal conclusion. The
 * classification is deterministic (declared type + filename + optional pasted
 * excerpt); the return shape matches what a model+OCR analyzer would produce,
 * so a real model can drop in. The document itself is never persisted.
 */

import { specialistFor, type LawDocType } from "./agents";

export interface LawAnalysis {
  docType: LawDocType;
  docLabel: string;
  agent: string;
  summary: string;
  keyPoints: string[];
  watchOuts: string[];
  rights: string[];
  questions: string[];
  stateNote: string;
  attorneyAreas: string[]; // partner practice areas to surface as ads
}

export const DOC_LABELS: Record<LawDocType, string> = {
  homeowner_insurance: "Homeowner / property insurance",
  auto_insurance: "Auto insurance",
  renters_insurance: "Renters insurance",
  real_estate: "Real estate contract",
  lease: "Lease / rental agreement",
  contract: "Contract / agreement",
  warranty: "Warranty",
  unknown: "Other document",
};

const SIGNALS: { type: LawDocType; re: RegExp }[] = [
  { type: "homeowner_insurance", re: /homeowner|dwelling|ho-?3|ho-?5|property insurance|hazard|windstorm|declarations/i },
  { type: "renters_insurance", re: /renter|ho-?4|tenant.{0,10}insurance/i },
  { type: "auto_insurance", re: /auto|vehicle|collision|comprehensive|uninsured motorist|gap insurance|policy.{0,10}(car|auto)/i },
  { type: "real_estate", re: /purchase agreement|deed|mortgage|closing|escrow|title|disclosure|hoa|realtor/i },
  { type: "lease", re: /lease|rental agreement|landlord|tenant|security deposit|month-to-month/i },
  { type: "warranty", re: /warranty|guarantee|limited warranty|service contract/i },
  { type: "contract", re: /agreement|contract|terms|arbitration|renewal|obligation/i },
];

function classify(declared: string, fileName: string, hint: string): LawDocType {
  const hay = `${declared} ${fileName} ${hint}`;
  for (const s of SIGNALS) if (s.re.test(hay)) return s.type;
  return "unknown";
}

const CONTENT: Record<LawDocType, Omit<LawAnalysis, "docType" | "docLabel" | "agent" | "stateNote">> = {
  homeowner_insurance: {
    summary: "This looks like a homeowner/property insurance policy. Here's what to understand about your coverage, your deductibles, and your rights when you file a claim.",
    keyPoints: [
      "Check whether it pays Replacement Cost (rebuild value) or Actual Cash Value (depreciated value) — the difference can be tens of thousands of dollars.",
      "Find your dwelling limit (Coverage A) and confirm it reflects today's rebuild cost, not the purchase price.",
      "Locate every deductible — many policies have a separate, larger deductible for wind/hurricane or water damage.",
    ],
    watchOuts: [
      "Exclusions section — flood and earth movement are almost always excluded and need separate policies.",
      "'Anti-concurrent causation' language can deny a whole claim if an excluded peril contributed.",
      "Proof-of-loss and claim-filing deadlines — missing them can forfeit a valid claim.",
    ],
    rights: [
      "You generally have the right to receive a copy of your full policy and to ask your insurer to explain any denial in writing.",
      "Most states let you invoke an 'appraisal' clause to resolve a disputed claim amount without a lawyer.",
      "You typically have the right to file a complaint with your state's Department of Insurance.",
    ],
    questions: [
      "Is my dwelling limit enough to fully rebuild at today's construction costs?",
      "What is my wind/hurricane deductible, in dollars, on a total loss?",
      "What exactly is excluded, and do I need a separate flood policy?",
    ],
    attorneyAreas: ["Homeowner / property insurance", "Insurance bad-faith"],
  },
  renters_insurance: {
    summary: "This appears to be a renters (HO-4) insurance policy covering your belongings and liability. Here's what it does and doesn't do.",
    keyPoints: [
      "It covers your personal property and liability — not the building (that's your landlord's policy).",
      "Check whether personal property is Replacement Cost or Actual Cash Value.",
      "Note the liability limit and any 'loss of use' coverage if your unit becomes uninhabitable.",
    ],
    watchOuts: [
      "Sub-limits on high-value items (jewelry, electronics) may be far below their value.",
      "Excluded perils (flood, earthquake) usually need separate coverage.",
    ],
    rights: [
      "You have the right to a copy of the policy and a written explanation of any denial.",
      "You can typically complain to your state Department of Insurance over an unfair denial.",
    ],
    questions: ["Are my valuables covered to full value or capped?", "Does this pay for temporary housing if I'm displaced?"],
    attorneyAreas: ["Homeowner / property insurance", "Insurance bad-faith"],
  },
  auto_insurance: {
    summary: "This looks like an auto insurance policy or claim document. Here's how your coverages work and the rights people most often overlook.",
    keyPoints: [
      "Liability (what you pay others), Collision (your car in a crash), and Comprehensive (theft, weather, animals) are separate — confirm which you carry.",
      "Uninsured/Underinsured Motorist (UM/UIM) coverage protects you when the other driver has little or no insurance — check your limits.",
      "Find your deductibles for collision and comprehensive.",
    ],
    watchOuts: [
      "A total-loss valuation you disagree with — policies usually include an appraisal right to challenge it.",
      "Diminished value and rental reimbursement are often available but not volunteered by the insurer.",
      "Short deadlines to report a claim or request UM/UIM.",
    ],
    rights: [
      "You generally have the right to a fair claim investigation and a written reason for any denial.",
      "Many states require the insurer to pay for a comparable rental or diminished value in a not-at-fault loss.",
      "You can dispute a total-loss amount via the policy's appraisal clause and complain to your state regulator.",
    ],
    questions: [
      "Do I have UM/UIM coverage, and is the limit high enough?",
      "How was my total-loss value calculated, and can I invoke appraisal?",
      "Am I entitled to a rental car or diminished-value payment?",
    ],
    attorneyAreas: ["Auto insurance disputes", "Insurance bad-faith"],
  },
  real_estate: {
    summary: "This appears to be a real estate document (purchase agreement, mortgage, or disclosure). Here are the terms, deadlines, and rights that matter most.",
    keyPoints: [
      "Identify every contingency (financing, inspection, appraisal) and its deadline — missing one can cost you your earnest money.",
      "Confirm who pays which closing costs and whether any fees are negotiable.",
      "Check the earnest-money amount and the exact conditions under which it's refundable vs. forfeited.",
    ],
    watchOuts: [
      "'As-is' clauses and waived inspections can leave you responsible for hidden defects.",
      "Prepayment penalties, balloon payments, or adjustable rates in mortgage documents.",
      "Required seller disclosures that are missing or incomplete.",
    ],
    rights: [
      "In most states, sellers must disclose known material defects; buyers often have a right to inspect.",
      "Many states give a short cancellation/rescission window on certain agreements — check yours.",
      "You generally have the right to a clear, itemized closing statement before you sign.",
    ],
    questions: [
      "What are my contingency deadlines, and what happens if I miss one?",
      "Under what conditions do I lose my earnest money?",
      "Are there any prepayment penalties or rate adjustments in the loan?",
    ],
    attorneyAreas: ["Real estate / property", "Contract review"],
  },
  lease: {
    summary: "This looks like a lease or rental agreement. Here's what you're agreeing to and the tenant rights that may protect you.",
    keyPoints: [
      "Note the term, rent, late-fee rules, and how much notice is required to end or renew.",
      "Find the security-deposit amount and the deadline for its return after you move out.",
      "Check who's responsible for repairs, utilities, and maintenance.",
    ],
    watchOuts: [
      "Automatic renewal clauses and steep early-termination penalties.",
      "Clauses waiving repairs or your right to habitability (often unenforceable, but a red flag).",
      "Excessive late fees or deposit terms that may exceed your state's legal cap.",
    ],
    rights: [
      "Most states cap security deposits and require their return (with an itemized list) within a set number of days.",
      "You generally have a right to a habitable home regardless of lease language to the contrary.",
      "Many states limit late fees and require specific notice before eviction.",
    ],
    questions: [
      "How and when do I get my full deposit back?",
      "Does this auto-renew, and how do I give proper notice?",
      "Are any of these fees above my state's legal limit?",
    ],
    attorneyAreas: ["Real estate / property", "Contract review"],
  },
  contract: {
    summary: "This appears to be a contract or agreement. Here are the obligations, traps, and exit terms to understand before you sign.",
    keyPoints: [
      "Identify exactly what each side must do, by when, and what you're paying.",
      "Find the term length, auto-renewal, and how to cancel (and by when).",
      "Look for arbitration clauses and class-action waivers — they affect how you could ever dispute this.",
    ],
    watchOuts: [
      "Auto-renewal with a narrow cancellation window.",
      "Fees, penalties, and 'liquidated damages' for ending early.",
      "Liability limits and indemnification clauses that shift risk onto you.",
    ],
    rights: [
      "Many states give a cooling-off period (often 3 days) to cancel certain contracts, like door-to-door sales.",
      "You generally have the right to a copy of anything you signed.",
      "Unfair or deceptive terms may be challengeable under your state's consumer-protection law.",
    ],
    questions: [
      "How and by when can I cancel without a penalty?",
      "Does this auto-renew, and what would ending it cost me?",
      "Am I giving up my right to sue or join a class action?",
    ],
    attorneyAreas: ["Contract review"],
  },
  warranty: {
    summary: "This looks like a warranty or service contract. Here's what it actually promises and how to make it pay out.",
    keyPoints: [
      "Separate what's covered from what's excluded, and for how long.",
      "Note what voids the warranty (missed maintenance, third-party repairs).",
      "Find the exact claim process and deadlines.",
    ],
    watchOuts: [
      "'Wear and tear' and pre-existing exclusions that gut the coverage.",
      "Requirements to use only authorized service centers.",
    ],
    rights: [
      "Federal law (Magnuson-Moss) protects written consumer-product warranties and limits some disclaimers.",
      "You generally can't be forced to use branded parts to keep a warranty valid.",
    ],
    questions: ["What voids this warranty?", "What's the step-by-step claim process and deadline?"],
    attorneyAreas: ["Contract review"],
  },
  unknown: {
    summary: "We couldn't confidently identify this document type, so Codex reviewed it as a general agreement. Here's a consumer-first read of what to check.",
    keyPoints: [
      "Identify the parties, what each must do, and any money changing hands.",
      "Find the term, renewal, and cancellation terms.",
      "Look for deadlines, fees, and dispute-resolution clauses.",
    ],
    watchOuts: ["Auto-renewals", "Penalties and fees", "Arbitration / class-action waivers"],
    rights: [
      "You generally have the right to a copy of anything you sign and time to read it.",
      "Unfair or deceptive terms may be challengeable under state consumer-protection law.",
    ],
    questions: ["What am I obligated to do?", "How do I get out of this, and what does it cost?"],
    attorneyAreas: ["Contract review"],
  },
};

/** US state consumer-protection flavor notes (illustrative). */
function stateNote(stateCode: string, type: LawDocType): string {
  const st = stateCode.toUpperCase();
  const generic = `Consumer-protection and ${type.includes("insurance") ? "insurance" : type === "lease" ? "landlord-tenant" : "contract"} rules vary by state. In ${st || "your state"}, check your state Attorney General and ${type.includes("insurance") ? "Department of Insurance" : "consumer-protection agency"} for the specific rights and deadlines that apply.`;
  const specifics: Record<string, string> = {
    CA: "California has strong consumer-protection laws (e.g., the CLRA and Unfair Competition Law) and specific insurance and tenant protections; deadlines and deposit caps are set by statute.",
    FL: "Florida has specific hurricane-deductible rules and tight property-insurance claim deadlines; review the notice requirements carefully.",
    TX: "Texas has specific property-insurance claim procedures (including prompt-payment rules) and its own landlord-tenant deposit timelines.",
    NY: "New York has strong tenant protections and insurance regulations; deposit and notice rules are set by statute.",
  };
  return specifics[st] ? `${specifics[st]} ${generic}` : generic;
}

export function analyzeDocument(input: {
  declaredType?: string;
  fileName: string;
  stateCode?: string;
  textHint?: string;
}): LawAnalysis {
  const type = classify(input.declaredType ?? "", input.fileName, input.textHint ?? "");
  const c = CONTENT[type];
  const agent = specialistFor(type);
  return {
    docType: type,
    docLabel: DOC_LABELS[type],
    agent: agent.name,
    stateNote: stateNote(input.stateCode ?? "", type),
    ...c,
  };
}

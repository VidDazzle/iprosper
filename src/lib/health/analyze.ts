/**
 * Medical Billing Advocate — document analysis engine. Produces an educational,
 * plain-English report that helps a patient understand a medical bill, EOB,
 * denial, or estimate and the rights that may apply.
 *
 * This is NOT legal or medical advice. Content is framed as points to understand
 * and questions to ask — never as a recommendation or legal conclusion. The
 * classification is deterministic (declared type + filename + optional pasted
 * excerpt); the return shape matches what a model+OCR analyzer would produce, so
 * a real model can drop in. The document itself is never persisted.
 */

import { healthSpecialistFor, type HealthDocType } from "./agents";

export interface HealthAnalysis {
  docType: HealthDocType;
  docLabel: string;
  agent: string;
  summary: string;
  keyPoints: string[];
  watchOuts: string[];
  rights: string[];
  nextSteps: string[];
  questions: string[];
  stateNote: string;
  attorneyAreas: string[]; // partner practice areas to surface as ads
}

export const HEALTH_DOC_LABELS: Record<HealthDocType, string> = {
  medical_bill: "Medical bill / provider statement",
  itemized_bill: "Itemized hospital bill",
  eob: "Explanation of Benefits (EOB)",
  denial_letter: "Claim denial letter",
  good_faith_estimate: "Good Faith Estimate",
  collections: "Medical collections notice",
  unknown: "Other healthcare document",
};

const SIGNALS: { type: HealthDocType; re: RegExp }[] = [
  { type: "eob", re: /explanation of benefits|\beob\b|allowed amount|patient responsibility|claim processed|this is not a bill/i },
  { type: "denial_letter", re: /denied|denial|not medically necessary|adverse benefit determination|appeal rights|claim was not approved/i },
  { type: "good_faith_estimate", re: /good faith estimate|\bgfe\b|no surprises act|self-pay estimate|uninsured estimate|expected charges/i },
  { type: "collections", re: /collection|past due|final notice|amount in collections|debt collector|placed with an agency|delinquent/i },
  { type: "itemized_bill", re: /itemized|line item|cpt|hcpcs|revenue code|rev code|units|detail of charges|charge description master|cdm/i },
  { type: "medical_bill", re: /statement|balance due|amount due|hospital|clinic|provider|medical center|patient balance|guarantor/i },
];

function classify(declared: string, fileName: string, hint: string): HealthDocType {
  const explicit = declared.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (explicit && explicit in HEALTH_DOC_LABELS) return explicit as HealthDocType;
  const hay = `${declared} ${fileName} ${hint}`;
  for (const s of SIGNALS) if (s.re.test(hay)) return s.type;
  return "unknown";
}

type Content = Omit<HealthAnalysis, "docType" | "docLabel" | "agent" | "stateNote">;

const CONTENT: Record<HealthDocType, Content> = {
  medical_bill: {
    summary:
      "This looks like a medical bill or provider statement. Before you pay it, understand what you're being charged, whether it matches what your insurer says you owe, and how to get it reduced.",
    keyPoints: [
      "The 'balance due' is what the provider says you owe after insurance — it is not always correct. Compare it to your insurer's Explanation of Benefits (EOB).",
      "A summary bill only shows totals. You have the right to a fully itemized bill listing every charge, code, and quantity.",
      "'Facility fees' and 'room and board' are often the largest lines and are where errors and inflated charges tend to hide.",
    ],
    watchOuts: [
      "Being billed more than your EOB's 'patient responsibility' amount — that gap can be a billing error or an improper balance bill.",
      "Paying before you've seen the itemized bill and confirmed your insurer processed the claim.",
      "Short 'pay now' discounts pressuring you before you've had a chance to review or dispute.",
    ],
    rights: [
      "You can request a fully itemized bill and an explanation of any charge, in writing.",
      "If you're uninsured or self-pay, you generally have the right to a Good Faith Estimate up front under the No Surprises Act.",
      "Nonprofit hospitals must have a written financial-assistance (charity-care) policy — you can ask for it and apply.",
    ],
    nextSteps: [
      "Request the itemized bill and your insurer's EOB, then compare the two side by side.",
      "Run the itemized bill through the auditor here to flag duplicates, quantity errors, and unbundling.",
      "Ask the billing office about financial assistance, a self-pay discount, or an interest-free payment plan before paying.",
    ],
    questions: [
      "Does this balance match the 'patient responsibility' on my EOB?",
      "Can I get a fully itemized bill with every code and quantity?",
      "Do I qualify for financial assistance, charity care, or a self-pay discount?",
    ],
    attorneyAreas: ["Medical billing & debt disputes", "Health insurance / ERISA"],
  },
  itemized_bill: {
    summary:
      "This appears to be an itemized hospital or provider bill. This is exactly the document to audit line by line — most billing errors live here, and studies have found errors on a large share of itemized hospital bills.",
    keyPoints: [
      "Every line should have a description, a code (CPT/HCPCS or revenue code), a quantity, and a charge. Missing detail is a reason to ask for more.",
      "Duplicate charges, wrong quantities, and 'unbundled' lab panels (billed as separate tests) are the most common inflators.",
      "Charges are the sticker price — insurers and self-pay patients routinely pay far less than the charged amount.",
    ],
    watchOuts: [
      "The same service billed twice, or a quantity greater than what a single visit would use.",
      "A lab panel plus its individual components billed separately (unbundling).",
      "Vague lines like 'miscellaneous,' 'supplies,' or 'pharmacy' with large dollar amounts and no detail.",
    ],
    rights: [
      "You have the right to an itemized bill and to a written explanation of any charge you question.",
      "You can dispute specific line items and ask the provider to correct or substantiate them before paying.",
      "You can request the charge amounts be reviewed against the hospital's published standard charges.",
    ],
    nextSteps: [
      "Enter the line items into the auditor here — it flags duplicates, quantity anomalies, unbundling, and vague charges, and drafts a dispute summary.",
      "Send the billing office a written request to correct or substantiate each flagged line.",
      "Ask about financial assistance and a self-pay/prompt-pay discount on the corrected balance.",
    ],
    questions: [
      "Why is this item billed at this quantity, and can you substantiate it?",
      "Are any of these lab or bundled charges being billed separately when they shouldn't be?",
      "What is the hospital's standard charge for these codes?",
    ],
    attorneyAreas: ["Medical billing & debt disputes", "Health insurance / ERISA"],
  },
  eob: {
    summary:
      "This is an Explanation of Benefits (EOB) from your insurer — it is NOT a bill. It tells you what the provider charged, what your plan allowed, what it paid, and what you actually owe.",
    keyPoints: [
      "'Allowed amount' is the negotiated price — you generally can't be balance-billed above it by an in-network provider.",
      "'Patient responsibility' is what you truly owe. Any provider bill above this figure deserves a second look.",
      "Look for deductible, copay, and coinsurance columns to see why your share is what it is.",
    ],
    watchOuts: [
      "A provider bill that exceeds the EOB's patient-responsibility amount.",
      "Services denied as 'not covered' or 'not medically necessary' — these are appealable.",
      "Out-of-network processing that should have been protected under the No Surprises Act.",
    ],
    rights: [
      "You have the right to appeal a denial — an internal appeal, then an independent external review.",
      "In-network providers generally cannot bill you above the allowed amount (that would be improper balance billing).",
      "You can request the plan's reason for any denial and the plan documents that support it.",
    ],
    nextSteps: [
      "Match this EOB against the provider's bill line by line before paying anything.",
      "If a claim was denied or underpaid, note the appeal deadline and file an internal appeal in writing.",
      "If you were billed above patient responsibility, ask the provider to correct it and cite your EOB.",
    ],
    questions: [
      "Does the provider's bill match my patient-responsibility amount here?",
      "Why was this line denied or reduced, and what is my appeal deadline?",
      "Was any of this processed out-of-network when it should have been protected?",
    ],
    attorneyAreas: ["Health insurance / ERISA", "Medical billing & debt disputes"],
  },
  denial_letter: {
    summary:
      "This looks like a claim denial or adverse benefit determination. A denial is not the final word — most plans must give you a defined appeal process with hard deadlines.",
    keyPoints: [
      "Find the exact reason code and language for the denial — 'not medically necessary,' 'not covered,' 'out of network,' or a coding/paperwork issue.",
      "Locate the appeal deadline (often 180 days for internal appeals on many plans) and the address/portal to file.",
      "Many denials are administrative (a missing code or authorization) and reverse once corrected.",
    ],
    watchOuts: [
      "Missing the internal-appeal deadline — it can forfeit your right to challenge.",
      "Accepting 'not medically necessary' without your doctor's supporting documentation.",
      "Assuming an out-of-network denial is valid when the No Surprises Act may protect you.",
    ],
    rights: [
      "You generally have the right to a full internal appeal and then an independent external review.",
      "You can request, free of charge, the plan documents and the specific rule used to deny the claim.",
      "Your provider can submit a letter of medical necessity to support the appeal.",
    ],
    nextSteps: [
      "Write down the denial reason and the appeal deadline today.",
      "Ask your provider for records and a letter of medical necessity, then file the internal appeal in writing.",
      "If the internal appeal fails, request an independent external review.",
    ],
    questions: [
      "What is the precise reason for this denial, and what rule supports it?",
      "What is my appeal deadline and how do I file?",
      "What documentation from my doctor would overturn it?",
    ],
    attorneyAreas: ["Health insurance / ERISA", "Medical billing & debt disputes"],
  },
  good_faith_estimate: {
    summary:
      "This appears to be a Good Faith Estimate (GFE) — the up-front price estimate the No Surprises Act requires for uninsured and self-pay patients. Keep it: it's your baseline if the final bill comes in much higher.",
    keyPoints: [
      "A GFE lists the expected charges for a service before you receive it, by provider and item.",
      "It's an estimate, but a final bill that exceeds it by $400 or more per provider can trigger the patient-provider dispute resolution process.",
      "The GFE should include the primary provider plus items and services reasonably expected with the care.",
    ],
    watchOuts: [
      "A final bill that runs $400+ above this estimate for the same provider.",
      "Charges for services not listed on the estimate at all.",
      "Being told a GFE isn't available when you're uninsured or self-pay (it generally must be provided).",
    ],
    rights: [
      "If you're uninsured or self-pay, you're generally entitled to a Good Faith Estimate before scheduled care.",
      "If the final bill is at least $400 more than the GFE, you can use the federal patient-provider dispute resolution process.",
      "You can ask for the GFE in writing and keep it to compare against the final bill.",
    ],
    nextSteps: [
      "Save this estimate and compare it against every final bill from the same provider.",
      "If a bill exceeds the estimate by $400+, start the patient-provider dispute resolution process (there's a filing window).",
      "Ask the provider to explain any charge that wasn't on the estimate.",
    ],
    questions: [
      "Does my final bill exceed this estimate by $400 or more?",
      "Were there charges not listed on this estimate?",
      "How do I start the patient-provider dispute process if it did?",
    ],
    attorneyAreas: ["Medical billing & debt disputes", "Health insurance / ERISA"],
  },
  collections: {
    summary:
      "This looks like a medical collections notice. Medical debt has special protections, and you have real leverage — including verifying the debt and applying for assistance that can wipe it out.",
    keyPoints: [
      "You can demand written validation of the debt before paying — including the itemized bill behind it.",
      "Recent credit-reporting rules keep paid medical collections off your report and delay/limit reporting of unpaid medical debt.",
      "The underlying bill may still contain errors — collections doesn't mean the amount is correct.",
    ],
    watchOuts: [
      "Paying a collector before validating the debt and the underlying itemized charges.",
      "Debt that was sent to collections while an insurance appeal or dispute was still open.",
      "Collector conduct that violates the Fair Debt Collection Practices Act (FDCPA).",
    ],
    rights: [
      "Under the FDCPA you can request written debt validation and dispute the debt within 30 days.",
      "You can still apply for hospital financial assistance/charity care even after a bill goes to collections.",
      "Medical debt has enhanced protections and limits on credit reporting compared to other debt.",
    ],
    nextSteps: [
      "Send a written debt-validation request and ask for the itemized bill behind the balance.",
      "Audit that itemized bill for errors and apply for financial assistance on the correct amount.",
      "Keep records; if the collector breaks FDCPA rules, that's actionable.",
    ],
    questions: [
      "Can you validate this debt and send the itemized bill behind it?",
      "Was this sent to collections while a claim or dispute was still open?",
      "Do I qualify for financial assistance that would reduce or clear this?",
    ],
    attorneyAreas: ["Medical debt", "Debt collection defense (FDCPA)", "Medical billing & debt disputes"],
  },
  unknown: {
    summary:
      "We couldn't confidently identify this healthcare document, so Ledger reviewed it as a general medical bill. Here's a consumer-first read of what to check.",
    keyPoints: [
      "Identify whether this is a bill, an insurer EOB, a denial, or an estimate — each has different rights and deadlines.",
      "Compare any amount owed against what your insurer says you actually owe.",
      "Ask for an itemized breakdown of any charge you don't recognize.",
    ],
    watchOuts: ["Amounts that don't match your EOB", "Vague or bundled charges", "Payment deadlines that rush you"],
    rights: [
      "You generally have the right to an itemized bill and a written explanation of charges.",
      "You can dispute errors and apply for financial assistance before paying.",
    ],
    nextSteps: [
      "Request the itemized bill and your EOB and compare them.",
      "Run the itemized charges through the auditor here.",
      "Ask about financial assistance and payment options.",
    ],
    questions: ["What exactly is this document?", "Does the amount match my EOB?", "Can I get an itemized breakdown?"],
    attorneyAreas: ["Medical billing & debt disputes"],
  },
};

/** US state medical-billing/debt flavor notes (illustrative, not exhaustive). */
function stateNote(stateCode: string, type: HealthDocType): string {
  const st = stateCode.toUpperCase();
  const generic = `Federal protections (the No Surprises Act, the FDCPA, and 501(r) charity-care rules for nonprofit hospitals) apply nationwide, but many states add stronger medical-billing and medical-debt protections. In ${st || "your state"}, check your state Attorney General, Department of Insurance, and hospital financial-assistance requirements for the specific rights and deadlines that apply.`;
  const specifics: Record<string, string> = {
    CA: "California has the Hospital Fair Pricing Act (charity care and discount-payment rules for eligible patients), strong surprise-billing protections, and limits on medical debt in collections and on credit reports.",
    NY: "New York limits hospital charges for eligible patients, has a surprise-billing law and independent dispute resolution, and restricts medical-debt reporting on credit files.",
    CO: "Colorado bars reporting of medical debt on credit reports, has surprise-billing protections, and requires hospital financial-assistance screening.",
    TX: "Texas has surprise-billing mediation/arbitration for certain out-of-network bills and specific itemized-bill and hospital financial-assistance requirements.",
    FL: "Florida has balance-billing protections for emergency and certain in-network facility care and requires providers to give price estimates on request.",
    IL: "Illinois has the Hospital Uninsured Patient Discount Act and the Fair Patient Billing Act governing collections and financial assistance.",
  };
  return specifics[st] ? `${specifics[st]} ${generic}` : generic;
}

export function analyzeHealthDocument(input: {
  declaredType?: string;
  fileName: string;
  stateCode?: string;
  textHint?: string;
}): HealthAnalysis {
  const type = classify(input.declaredType ?? "", input.fileName, input.textHint ?? "");
  const c = CONTENT[type];
  const agent = healthSpecialistFor(type);
  return {
    docType: type,
    docLabel: HEALTH_DOC_LABELS[type],
    agent: agent.name,
    stateNote: stateNote(input.stateCode ?? "", type),
    ...c,
  };
}

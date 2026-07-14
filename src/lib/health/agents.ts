/**
 * Medical Billing Advocate — the healthcare consumer-advocate workforce.
 *
 * A master orchestrator (Remedy) routes each uploaded bill, EOB, denial, or
 * estimate to a specialist sub-agent, checks it against federal and state
 * patient-billing rules, and assembles a plain-English report that helps people
 * UNDERSTAND their medical bills, spot likely errors, and know their rights.
 *
 * IMPORTANT: This is NOT a law firm, NOT medical advice, and NOT legal advice.
 * It is an educational consumer-advocacy tool. Documents are analyzed in memory
 * and never stored.
 */

export type HealthDocType =
  | "medical_bill"
  | "itemized_bill"
  | "eob"
  | "denial_letter"
  | "good_faith_estimate"
  | "collections"
  | "unknown";

export interface HealthAgent {
  id: string;
  name: string;
  role: string;
  summary: string;
  gradient: string;
  master?: boolean;
  handles?: HealthDocType[];
}

export const HEALTH_AGENTS: HealthAgent[] = [
  {
    id: "remedy",
    name: "Remedy",
    role: "Master Billing Advocate",
    summary:
      "Remedy is the advocate at the center. It reads what you upload — a hospital bill, an Explanation of Benefits, a denial, or an estimate — routes it to the right specialist, checks it against the No Surprises Act and your state's medical-billing rules, and assembles one clear report: what you're being charged, what looks wrong, and the rights most people never use. Remedy never gives legal or medical advice; it makes bills understandable.",
    gradient: "from-teal-300 to-cyan-500",
    master: true,
  },
  {
    id: "ledger",
    name: "Ledger",
    role: "Itemized-Bill Auditor",
    summary:
      "Ledger audits line-item hospital and provider bills for the errors that quietly inflate them: duplicate charges, quantities that don't add up, unbundled lab panels billed as separate tests, upcoded visit levels, and vague 'miscellaneous' fees. It estimates how much is worth questioning and drafts a dispute-ready summary you can send to the billing office.",
    gradient: "from-emerald-400 to-teal-600",
    handles: ["itemized_bill", "medical_bill"],
  },
  {
    id: "claimant",
    name: "Claimant",
    role: "EOB & Claims / Appeals",
    summary:
      "Claimant decodes your Explanation of Benefits and denial letters: allowed amount vs. billed amount, what your plan actually paid, why a claim was denied or downcoded, and the internal-appeal and external-review deadlines that give you a real shot at reversing it.",
    gradient: "from-sky-400 to-indigo-600",
    handles: ["eob", "denial_letter"],
  },
  {
    id: "shield",
    name: "Shield",
    role: "Patient Rights & No Surprises Act",
    summary:
      "Shield knows the federal protections: the No Surprises Act's ban on most surprise and balance bills from out-of-network emergency care and out-of-network providers at in-network facilities, your right to a Good Faith Estimate if you're uninsured or self-pay, and the patient-dispute process when a bill runs far past the estimate.",
    gradient: "from-cyan-400 to-blue-600",
    handles: ["good_faith_estimate"],
  },
  {
    id: "relief",
    name: "Relief",
    role: "Financial Assistance & Negotiation",
    summary:
      "Relief finds the ways to actually lower the balance: hospital charity-care and financial-assistance policies (required of nonprofit hospitals under IRC 501(r)), prompt-pay and self-pay discounts, interest-free payment plans, and how medical debt is now treated differently on your credit report.",
    gradient: "from-amber-400 to-orange-600",
    handles: ["collections"],
  },
  {
    id: "herald",
    name: "Herald",
    role: "Attorney Outreach & Advertising",
    summary:
      "Herald keeps this service affordable. It recruits medical-billing, health-insurance, and consumer attorneys to advertise to people who need a professional review — using the same flat-fee advertising model as the rest of the platform (never a share of legal fees). That advertising revenue is what lets us charge you only enough to cover cost.",
    gradient: "from-pink-400 to-rose-600",
  },
];

export function healthSpecialistFor(type: HealthDocType): HealthAgent {
  return (
    HEALTH_AGENTS.find((a) => a.handles?.includes(type)) ??
    HEALTH_AGENTS.find((a) => a.id === "ledger")!
  );
}

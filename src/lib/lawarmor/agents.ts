/**
 * Law & Armor — the consumer-advocate document-analysis workforce.
 *
 * A master orchestrator (Aegis) routes each uploaded document to a specialist
 * sub-agent, consults the state-law engine, and assembles a plain-English
 * report that helps consumers UNDERSTAND their documents and rights.
 *
 * IMPORTANT: Law & Armor is NOT a law firm and does NOT provide legal advice.
 * It is an educational consumer-advocacy tool. Every agent operates under that
 * hard constraint. Documents are analyzed in memory and never stored.
 */

export type LawDocType =
  | "homeowner_insurance"
  | "auto_insurance"
  | "renters_insurance"
  | "real_estate"
  | "lease"
  | "contract"
  | "warranty"
  | "unknown";

export interface LawArmorAgent {
  id: string;
  name: string;
  role: string;
  summary: string;
  gradient: string;
  master?: boolean;
  handles?: LawDocType[];
}

export const LAWARMOR_AGENTS: LawArmorAgent[] = [
  {
    id: "aegis",
    name: "Aegis",
    role: "Master Orchestrator",
    summary:
      "Aegis is the shield at the center. It reads what you upload, routes it to the right specialist, pulls the consumer-protection rules for your state, and assembles everything into one clear report — key points, watch-outs, and the rights you may not know you have. Aegis never gives legal advice; it makes documents understandable.",
    gradient: "from-slate-300 to-cyan-500",
    master: true,
  },
  {
    id: "bastion",
    name: "Bastion",
    role: "Homeowner & Property Insurance",
    summary:
      "Bastion decodes homeowner, condo, and renters policies: what's actually covered, exclusions, deductibles (including hurricane/wind and water), replacement-cost vs. actual-cash-value, and the claim deadlines and appraisal rights buried in the fine print.",
    gradient: "from-emerald-400 to-teal-600",
    handles: ["homeowner_insurance", "renters_insurance"],
  },
  {
    id: "vantage",
    name: "Vantage",
    role: "Auto Insurance",
    summary:
      "Vantage explains auto policies and claims: liability vs. collision vs. comprehensive, uninsured/underinsured motorist coverage, rental and diminished-value rights, and the total-loss and appraisal provisions most people never read until it's too late.",
    gradient: "from-sky-400 to-indigo-600",
    handles: ["auto_insurance"],
  },
  {
    id: "cornerstone",
    name: "Cornerstone",
    role: "Real Estate & Leases",
    summary:
      "Cornerstone reviews purchase agreements, leases, mortgages, disclosures, and HOA documents: contingencies, deadlines, who pays what, penalty and forfeiture clauses, security-deposit and habitability rights, and the fees that quietly stack up at closing.",
    gradient: "from-amber-400 to-orange-600",
    handles: ["real_estate", "lease"],
  },
  {
    id: "codex",
    name: "Codex",
    role: "Contracts & Warranties",
    summary:
      "Codex breaks down any contract — service agreements, financing, employment, warranties, terms of service: auto-renewal and cancellation terms, arbitration and class-action waivers, fees and penalties, liability limits, and the obligations you'd be agreeing to.",
    gradient: "from-violet-400 to-purple-600",
    handles: ["contract", "warranty", "unknown"],
  },
  {
    id: "statute",
    name: "Statute",
    role: "State-Law Engine",
    summary:
      "Statute knows how the rules change by state — insurance codes, landlord-tenant law, real-estate disclosure requirements, cooling-off periods, and consumer-protection statutes — and flags the state-specific rights that apply to your document.",
    gradient: "from-cyan-400 to-blue-600",
  },
  {
    id: "envoy",
    name: "Envoy",
    role: "Attorney Outreach & Advertising",
    summary:
      "Envoy keeps Law & Armor affordable. It recruits insurance, real-estate, and contract attorneys to advertise to consumers who need a professional review — using the same flat-fee advertising model as the rest of the platform (never a share of legal fees). That advertising revenue is what lets us charge you only enough to cover cost.",
    gradient: "from-pink-400 to-rose-600",
  },
];

export function specialistFor(type: LawDocType): LawArmorAgent {
  return (
    LAWARMOR_AGENTS.find((a) => a.handles?.includes(type)) ??
    LAWARMOR_AGENTS.find((a) => a.id === "codex")!
  );
}

/**
 * Deterministic sample portfolio for the admin console.
 *
 * Seeded PRNG so the data is stable across renders and server/client. In
 * production, replace `getPortfolio()` with Drizzle queries returning the same
 * Client[] shape — reports.ts and the UI consume this shape and need no changes.
 */

import type {
  AgentActivityEntry,
  Client,
  ClientPhase,
  Deposit,
  DebtType,
  EnrolledDebt,
} from "./types";
import type { AgentId } from "@/lib/agents/types";

// Mulberry32 seeded PRNG.
function rng(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST = ["James", "Maria", "David", "Ashley", "Robert", "Jessica", "Michael", "Linda", "Carlos", "Emily", "Brian", "Nicole", "Kevin", "Sandra", "Tyler", "Diane", "Marcus", "Rachel", "Derek", "Angela", "Sofia", "Nathan", "Priya", "Omar", "Grace", "Hunter", "Tanya", "Luis"];
const LAST = ["Carter", "Nguyen", "Ramirez", "Johnson", "Williams", "Brooks", "Patel", "Hughes", "Reyes", "Foster", "Bennett", "Coleman", "Rivera", "Powell", "Sanders", "Morgan", "Diaz", "Ward", "Cruz", "Perry", "Bell", "Ross", "Kim", "Hassan", "Adams", "Grant", "Ortiz", "Cole"];
const STATES = ["CA", "TX", "FL", "NY", "IL", "PA", "OH", "AZ", "NC", "MI", "WA", "CO", "TN", "MO"];
const SOURCES = ["facebook", "tiktok", "google", "youtube", "organic", "x", "linkedin", "referral"];
const CREDITORS: Record<DebtType, string[]> = {
  credit_card: ["Chase", "Capital One", "Citi", "Bank of America", "Discover", "Synchrony", "American Express"],
  medical: ["St. Mary's Hospital", "Regional Medical Ctr", "LabCorp", "Radiology Assoc.", "EmergiCare"],
  personal_loan: ["SoFi", "LendingClub", "Upstart", "Best Egg", "Avant"],
  store_card: ["Comenity", "Macy's Card", "Home Depot Card", "Kohl's Charge"],
  collection: ["Portfolio Recovery", "Midland Credit", "LVNV Funding", "Cavalry SPV"],
  business: ["Kabbage", "OnDeck", "BlueVine", "Fundbox"],
};
const AGENTS: AgentId[] = ["aria", "atlas", "nova", "ledger", "sentinel", "echo", "sage", "pulse", "guardian"];

const PHASES: { phase: ClientPhase; weight: number }[] = [
  { phase: "enrolled-saving", weight: 8 },
  { phase: "negotiating", weight: 7 },
  { phase: "settling", weight: 6 },
  { phase: "graduated", weight: 4 },
  { phase: "intake", weight: 2 },
  { phase: "withdrawn", weight: 1 },
];

function pick<T>(r: () => number, arr: T[]): T {
  return arr[Math.floor(r() * arr.length)];
}

function daysAgoISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function makeDebts(r: () => number, phase: ClientPhase): EnrolledDebt[] {
  const count = 2 + Math.floor(r() * 5);
  const debts: EnrolledDebt[] = [];
  for (let i = 0; i < count; i++) {
    const type = pick(r, Object.keys(CREDITORS) as DebtType[]);
    const original = Math.round((1500 + r() * 12000) / 50) * 50;
    // Decide settled based on phase.
    const settledLikely =
      phase === "graduated" ? 0.9 : phase === "settling" ? 0.55 : phase === "negotiating" ? 0.25 : 0.05;
    const isSettled = r() < settledLikely;
    const litigationRisk = Math.min(100, Math.round(r() * (type === "credit_card" ? 70 : 40)));

    if (isSettled) {
      const pct = 0.38 + r() * 0.24; // 38–62%
      const settlementAmount = Math.round((original * pct) / 10) * 10;
      const feePct = 0.15 + r() * 0.1;
      debts.push({
        id: `d${i}`,
        creditor: pick(r, CREDITORS[type]),
        type,
        originalBalance: original,
        currentBalance: settlementAmount,
        status: r() < 0.7 ? "paid" : "settled",
        settlementAmount,
        settlementPct: pct,
        feeCharged: Math.round(original * feePct),
        settledOn: daysAgoISO(Math.floor(r() * 300)),
        litigationRisk,
      });
    } else {
      const grown = Math.round(original * (1 + r() * 0.12));
      const inLit = litigationRisk > 60 && r() < 0.3;
      const status: EnrolledDebt["status"] = inLit
        ? "litigation"
        : phase === "negotiating" && r() < 0.5
          ? r() < 0.4 ? "offer_pending" : "negotiating"
          : "enrolled";
      debts.push({
        id: `d${i}`,
        creditor: pick(r, CREDITORS[type]),
        type,
        originalBalance: original,
        currentBalance: grown,
        status,
        litigationRisk,
      });
    }
  }
  return debts;
}

function makeDeposits(r: () => number, monthly: number, months: number): Deposit[] {
  const out: Deposit[] = [];
  for (let m = months; m >= 1; m--) {
    const missed = r() < 0.08;
    out.push({
      id: `dep${m}`,
      date: daysAgoISO(m * 30),
      amount: monthly,
      status: missed ? "missed" : "cleared",
    });
  }
  out.push({ id: "dep-next", date: daysAgoISO(-5), amount: monthly, status: "scheduled" });
  return out;
}

const ACTIVITY_TEMPLATES: Record<AgentId, string[]> = {
  aria: ["Completed enrollment call; all TSR disclosures delivered and acknowledged.", "Re-verified budget after income change."],
  atlas: ["Classified 5 tradelines; flagged 1 account nearing statute of limitations.", "Rebuilt creditor dossier after debt sale detected."],
  nova: ["Opened negotiation with creditor; anchored at 35%.", "Countered creditor offer 55% → 44%; awaiting client approval.", "Settlement agreement executed and verified."],
  ledger: ["Monthly deposit cleared; account on track for next settlement.", "Released settlement disbursement after client authorization.", "Reconciliation passed; no discrepancies."],
  sentinel: ["Screened outbound settlement letter — approved.", "Verified fee gate passed before fee collection.", "Blocked a premature fee attempt; escalated for review."],
  echo: ["Recorded-consent captured; call handled in Spanish.", "Detected client distress; slowed pace and simplified."],
  sage: ["Monthly progress review; client morale check-in.", "Processed hardship adjustment to deposit schedule."],
  pulse: ["Litigation propensity on Chase account crossed high threshold; alerted Nova.", "Credit file updated; impact report generated."],
  guardian: ["Documented FDCPA violation by collector.", "Client served; briefed referral attorney within 24h."],
  beacon: ["Onboarded a new attorney advertiser; verified bar number.", "Routed a verified client connection to a Spotlight attorney."],
  chronos: ["Synced attorney calendar free/busy; refreshed open slots.", "Booked a client consultation and sent calendar invites to both sides."],
};

function makeActivity(r: () => number, phase: ClientPhase): AgentActivityEntry[] {
  const count = 4 + Math.floor(r() * 8);
  const out: AgentActivityEntry[] = [];
  for (let i = 0; i < count; i++) {
    const agent = pick(r, AGENTS);
    const templates = ACTIVITY_TEMPLATES[agent];
    out.push({
      id: `a${i}`,
      date: daysAgoISO(Math.floor(r() * 200)),
      agent,
      channel: pick(r, ["voice", "sms", "email", "internal"] as const),
      summary: pick(r, templates),
      complianceScreened: true,
    });
  }
  return out.sort((a, b) => (a.date < b.date ? 1 : -1));
}

function weightedPhase(r: () => number): ClientPhase {
  const total = PHASES.reduce((s, p) => s + p.weight, 0);
  let x = r() * total;
  for (const p of PHASES) {
    if ((x -= p.weight) <= 0) return p.phase;
  }
  return "enrolled-saving";
}

let CACHE: Client[] | null = null;

export function getPortfolio(): Client[] {
  if (CACHE) return CACHE;
  const clients: Client[] = [];
  for (let i = 0; i < 28; i++) {
    const r = rng(1000 + i * 97);
    const phase = weightedPhase(r);
    const debts = makeDebts(r, phase);
    const monthly = Math.round((250 + r() * 550) / 10) * 10;
    const monthsIn =
      phase === "intake" ? 0 : phase === "graduated" ? 30 + Math.floor(r() * 8) : 3 + Math.floor(r() * 24);
    const deposits = makeDeposits(r, monthly, monthsIn);
    const scoreStart = 560 + Math.floor(r() * 90);
    // Credit typically dips then partially recovers with settlements.
    const settledCount = debts.filter((d) => d.status === "settled" || d.status === "paid").length;
    const dip = -Math.floor(r() * 80) - 20;
    const recovery = settledCount * (8 + Math.floor(r() * 10));
    const current = Math.max(480, Math.min(760, scoreStart + dip + recovery));
    const balance =
      deposits.filter((d) => d.status === "cleared").reduce((s, d) => s + d.amount, 0) -
      debts.filter((d) => d.status === "paid").reduce((s, d) => s + (d.settlementAmount ?? 0) + (d.feeCharged ?? 0), 0);

    clients.push({
      id: `SOLV-${(10248 + i).toString()}`,
      name: `${pick(r, FIRST)} ${pick(r, LAST)}`,
      email: `client${i}@example.com`,
      stateCode: pick(r, STATES),
      phase,
      enrolledOn: daysAgoISO(monthsIn * 30 + Math.floor(r() * 20)),
      monthlyDeposit: monthly,
      dedicatedAccountBalance: Math.max(0, Math.round(balance)),
      creditScoreAtEnrollment: scoreStart,
      currentCreditScore: current,
      source: pick(r, SOURCES),
      debts,
      deposits,
      activity: makeActivity(r, phase),
      litigationActive: debts.some((d) => d.status === "litigation"),
    });
  }
  CACHE = clients;
  return clients;
}

export function getClient(id: string): Client | undefined {
  return getPortfolio().find((c) => c.id === id);
}

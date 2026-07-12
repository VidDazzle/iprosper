/**
 * Reporting layer — pure aggregation over the portfolio. Every admin report
 * is derived here so the UI stays presentational and the data source (mock or
 * live DB) is swappable in one place: getPortfolio().
 */

import { getPortfolio } from "./mock-data";
import type {
  Client,
  ClientCaseSummary,
  DebtType,
  PortfolioKpis,
} from "./types";
import type { ClientPhase } from "@/lib/agents/types";

const ACTIVE_PHASES: ClientPhase[] = ["intake", "enrolled-saving", "negotiating", "settling"];
const SETTLED = new Set(["settled", "paid"]);

export function portfolioKpis(clients = getPortfolio()): PortfolioKpis {
  let totalEnrolledDebt = 0;
  let debtSettledOriginal = 0;
  let debtSettledPaid = 0;
  let feesEarned = 0;
  let feesInPipeline = 0;
  let accountBalances = 0;
  let settlementPctSum = 0;
  let settlementPctCount = 0;
  let litigationCases = 0;

  for (const c of clients) {
    accountBalances += c.dedicatedAccountBalance;
    if (c.litigationActive) litigationCases++;
    for (const d of c.debts) {
      totalEnrolledDebt += d.originalBalance;
      if (SETTLED.has(d.status)) {
        debtSettledOriginal += d.originalBalance;
        debtSettledPaid += d.settlementAmount ?? 0;
        feesEarned += d.feeCharged ?? 0;
        if (d.settlementPct) {
          settlementPctSum += d.settlementPct;
          settlementPctCount++;
        }
      } else {
        feesInPipeline += d.originalBalance * 0.2; // projected 20% fee
      }
    }
  }

  const graduated = clients.filter((c) => c.phase === "graduated").length;
  const withdrawn = clients.filter((c) => c.phase === "withdrawn").length;

  return {
    activeClients: clients.filter((c) => ACTIVE_PHASES.includes(c.phase)).length,
    totalClients: clients.length,
    totalEnrolledDebt,
    debtSettledOriginal,
    debtSettledPaid,
    clientSavings: debtSettledOriginal - debtSettledPaid,
    avgSettlementPct: settlementPctCount ? settlementPctSum / settlementPctCount : 0,
    feesEarned,
    feesInPipeline,
    accountBalances,
    graduationRate: graduated + withdrawn ? graduated / (graduated + withdrawn) : 0,
    litigationCases,
  };
}

export function caseSummary(c: Client): ClientCaseSummary {
  const enrolledDebtTotal = c.debts.reduce((s, d) => s + d.originalBalance, 0);
  const settled = c.debts.filter((d) => SETTLED.has(d.status));
  const settledDebtTotal = settled.reduce((s, d) => s + d.originalBalance, 0);
  const settledPaidTotal = settled.reduce((s, d) => s + (d.settlementAmount ?? 0), 0);
  const cleared = c.deposits.filter((d) => d.status === "cleared").length;
  const missed = c.deposits.filter((d) => d.status === "missed").length;

  const offerPending = c.debts.find((d) => d.status === "offer_pending");
  const inLit = c.debts.find((d) => d.status === "litigation");
  const nextAction = inLit
    ? "Guardian: litigation active — attorney referral in progress"
    : offerPending
      ? `Nova: settlement offer on ${offerPending.creditor} awaiting client approval`
      : c.phase === "graduated"
        ? "Sage: program complete — credit-rebuilding plan sent"
        : c.phase === "intake"
          ? "Aria: complete enrollment & open dedicated account"
          : "Ledger: accumulating funds toward next settlement";

  return {
    client: c,
    enrolledDebtTotal,
    settledDebtTotal,
    settledPaidTotal,
    savings: settledDebtTotal - settledPaidTotal,
    savingsPct: settledDebtTotal ? (settledDebtTotal - settledPaidTotal) / settledDebtTotal : 0,
    progressPct: enrolledDebtTotal ? settledDebtTotal / enrolledDebtTotal : 0,
    depositAdherence: cleared + missed ? cleared / (cleared + missed) : 1,
    nextAction,
    creditDelta: c.currentCreditScore - c.creditScoreAtEnrollment,
  };
}

export function allCaseSummaries(): ClientCaseSummary[] {
  return getPortfolio()
    .map(caseSummary)
    .sort((a, b) => b.enrolledDebtTotal - a.enrolledDebtTotal);
}

/* ------------------------------ Chart datasets ---------------------------- */

const PHASE_LABELS: Record<ClientPhase, string> = {
  prospect: "Prospect",
  intake: "Intake",
  "enrolled-saving": "Saving",
  negotiating: "Negotiating",
  settling: "Settling",
  graduated: "Graduated",
  withdrawn: "Withdrawn",
};

export function funnelByPhase() {
  const clients = getPortfolio();
  const order: ClientPhase[] = ["intake", "enrolled-saving", "negotiating", "settling", "graduated"];
  return order.map((phase) => ({
    phase: PHASE_LABELS[phase],
    clients: clients.filter((c) => c.phase === phase).length,
  }));
}

export function debtByType() {
  const clients = getPortfolio();
  const labels: Record<DebtType, string> = {
    credit_card: "Credit cards",
    medical: "Medical",
    personal_loan: "Personal loans",
    store_card: "Store cards",
    collection: "Collections",
    business: "Business",
  };
  const map = new Map<DebtType, number>();
  for (const c of clients)
    for (const d of c.debts) map.set(d.type, (map.get(d.type) ?? 0) + d.originalBalance);
  return (Object.keys(labels) as DebtType[])
    .map((t) => ({ type: labels[t], amount: Math.round(map.get(t) ?? 0) }))
    .filter((x) => x.amount > 0)
    .sort((a, b) => b.amount - a.amount);
}

export function leadsBySource() {
  const clients = getPortfolio();
  const map = new Map<string, number>();
  for (const c of clients) map.set(c.source, (map.get(c.source) ?? 0) + 1);
  return [...map.entries()]
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count);
}

/** Settlements per month over the trailing 12 months. */
export function settlementsOverTime() {
  const clients = getPortfolio();
  const now = new Date();
  const buckets: { month: string; settled: number; savings: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      month: d.toLocaleString("en-US", { month: "short" }),
      settled: 0,
      savings: 0,
    });
  }
  for (const c of clients) {
    for (const d of c.debts) {
      if (!d.settledOn || !SETTLED.has(d.status)) continue;
      const sd = new Date(d.settledOn);
      const monthsAgo = (now.getFullYear() - sd.getFullYear()) * 12 + (now.getMonth() - sd.getMonth());
      const idx = 11 - monthsAgo;
      if (idx >= 0 && idx < 12) {
        buckets[idx].settled += 1;
        buckets[idx].savings += d.originalBalance - (d.settlementAmount ?? 0);
      }
    }
  }
  return buckets;
}

/** Settlement performance grouped by creditor. */
export function settlementByCreditor() {
  const clients = getPortfolio();
  const map = new Map<string, { count: number; pctSum: number; saved: number }>();
  for (const c of clients)
    for (const d of c.debts) {
      if (!SETTLED.has(d.status) || d.settlementPct == null) continue;
      const e = map.get(d.creditor) ?? { count: 0, pctSum: 0, saved: 0 };
      e.count++;
      e.pctSum += d.settlementPct;
      e.saved += d.originalBalance - (d.settlementAmount ?? 0);
      map.set(d.creditor, e);
    }
  return [...map.entries()]
    .map(([creditor, e]) => ({
      creditor,
      settlements: e.count,
      avgPct: e.pctSum / e.count,
      saved: Math.round(e.saved),
    }))
    .sort((a, b) => b.settlements - a.settlements)
    .slice(0, 10);
}

/** Per-agent activity + compliance-screen counts. */
export function agentPerformance() {
  const clients = getPortfolio();
  const map = new Map<string, { actions: number; voice: number; screened: number }>();
  for (const c of clients)
    for (const a of c.activity) {
      const e = map.get(a.agent) ?? { actions: 0, voice: 0, screened: 0 };
      e.actions++;
      if (a.channel === "voice") e.voice++;
      if (a.complianceScreened) e.screened++;
      map.set(a.agent, e);
    }
  return map;
}

/** Deposits collected vs projected over trailing 12 months. */
export function depositsOverTime() {
  const clients = getPortfolio();
  const now = new Date();
  const buckets: { month: string; cleared: number; missed: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({ month: d.toLocaleString("en-US", { month: "short" }), cleared: 0, missed: 0 });
  }
  for (const c of clients)
    for (const dep of c.deposits) {
      if (dep.status === "scheduled") continue;
      const dd = new Date(dep.date);
      const monthsAgo = (now.getFullYear() - dd.getFullYear()) * 12 + (now.getMonth() - dd.getMonth());
      const idx = 11 - monthsAgo;
      if (idx >= 0 && idx < 12) {
        if (dep.status === "cleared") buckets[idx].cleared += dep.amount;
        else buckets[idx].missed += dep.amount;
      }
    }
  return buckets.map((b) => ({ ...b, cleared: Math.round(b.cleared), missed: Math.round(b.missed) }));
}

/**
 * Domain model for Solvana's operations — the entities the admin console
 * reports on. In production these map to database tables; the admin data
 * layer (reports.ts) is written so the mock source can be swapped for live
 * Drizzle queries without changing the report/UI code.
 */

import type { AgentId, ClientPhase } from "@/lib/agents/types";

export type { ClientPhase };

export type DebtType =
  | "credit_card"
  | "medical"
  | "personal_loan"
  | "store_card"
  | "collection"
  | "business";

export type DebtStatus =
  | "enrolled" // in program, saving toward settlement
  | "negotiating" // Nova has active contact with creditor
  | "offer_pending" // offer awaiting client approval
  | "settled" // agreement executed, being paid
  | "paid" // fully paid, resolved
  | "litigation"; // creditor filed suit → Guardian

export interface EnrolledDebt {
  id: string;
  creditor: string;
  type: DebtType;
  originalBalance: number;
  currentBalance: number; // may grow with interest/fees pre-settlement
  status: DebtStatus;
  settlementAmount?: number; // agreed settlement, if any
  settlementPct?: number; // settlementAmount / originalBalance
  feeCharged?: number; // Solvana fee on this debt (post fee-gate only)
  settledOn?: string; // ISO date
  litigationRisk: number; // 0–100, from Pulse
}

export interface Deposit {
  id: string;
  date: string; // ISO
  amount: number;
  status: "cleared" | "scheduled" | "missed";
}

export interface AgentActivityEntry {
  id: string;
  date: string; // ISO
  agent: AgentId;
  channel: "voice" | "sms" | "email" | "internal";
  summary: string;
  complianceScreened: boolean;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  stateCode: string;
  phase: ClientPhase;
  enrolledOn: string; // ISO
  monthlyDeposit: number;
  dedicatedAccountBalance: number;
  creditScoreAtEnrollment: number;
  currentCreditScore: number;
  source: string; // marketing source
  debts: EnrolledDebt[];
  deposits: Deposit[];
  activity: AgentActivityEntry[];
  litigationActive: boolean;
}

/* ------------------------------- Report DTOs ------------------------------ */

export interface PortfolioKpis {
  activeClients: number;
  totalClients: number;
  totalEnrolledDebt: number;
  debtSettledOriginal: number; // original balance of settled debts
  debtSettledPaid: number; // what was actually paid
  clientSavings: number; // original - paid on settled debts
  avgSettlementPct: number;
  feesEarned: number;
  feesInPipeline: number; // potential fees on not-yet-settled debt
  accountBalances: number; // total across dedicated accounts
  graduationRate: number; // graduated / (graduated + withdrawn)
  litigationCases: number;
}

export interface ClientCaseSummary {
  client: Client;
  enrolledDebtTotal: number;
  settledDebtTotal: number;
  settledPaidTotal: number;
  savings: number;
  savingsPct: number;
  progressPct: number; // settled / enrolled by original balance
  depositAdherence: number; // cleared / (cleared + missed)
  nextAction: string;
  creditDelta: number;
}

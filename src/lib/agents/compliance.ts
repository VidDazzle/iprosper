/**
 * Sentinel compliance layer — the legal framework, enforced in code.
 *
 * Debt settlement is a regulated activity. The rules below implement the
 * constraints every X Debt agent operates under. They are evaluated by the
 * orchestrator before any fee event, disclosure-bearing call, or outbound
 * contact — an agent cannot opt out of them.
 *
 * Primary authorities:
 *  - FTC Telemarketing Sales Rule, 16 C.F.R. § 310.4(a)(5) (advance-fee ban,
 *    dedicated account requirements, mandatory disclosures)
 *  - TCPA, 47 U.S.C. § 227 (consent for calls/texts, calling hours)
 *  - GLBA privacy & safeguards rules (client financial data)
 *  - FDCPA awareness (creditor conduct monitoring on the client's behalf)
 *  - State debt-settlement licensing and bonding statutes
 */

import type { ClientPhase } from "./types";

/** Disclosures the TSR requires before a consumer enrolls. Aria must deliver
 *  every one of these on a recorded line and obtain affirmative consent. */
export const TSR_REQUIRED_DISCLOSURES = [
  "It will take an estimated 24 to 36 months before X Debt makes a settlement offer to each of your creditors.",
  "You must save an estimated amount in your dedicated account before X Debt will make a settlement offer to each creditor.",
  "X Debt's fee is 15%–25% of each enrolled debt and is charged only after a debt is settled and you have made at least one payment toward that settlement.",
  "The program requires you to stop paying your creditors. This will likely hurt your credit score, and your creditors may continue to add interest and late fees, call you, or sue you.",
  "Your creditors are not obligated to accept any settlement offer, and forgiven debt may be treated as taxable income.",
  "The dedicated account is FDIC-insured, is owned and controlled by you, is held at an independent institution not affiliated with X Debt, and you may withdraw your funds at any time without penalty.",
  "X Debt does not make monthly payments to your creditors and does not lend money or pay your debts directly.",
  "X Debt is not a law firm and does not provide legal advice.",
] as const;

/** TSR advance-fee ban: the three conditions that must ALL be true before a
 *  single dollar of fee may be collected on an enrolled debt. */
export interface FeeGateInput {
  /** A settlement agreement with the creditor has been executed. */
  settlementAgreementExecuted: boolean;
  /** The agreement's terms match what the client approved. */
  termsApprovedByClient: boolean;
  /** The client has made at least one payment to the creditor under it. */
  firstSettlementPaymentMade: boolean;
}

export function feeGate(input: FeeGateInput): { allowed: boolean; blockedBy: string[] } {
  const blockedBy: string[] = [];
  if (!input.settlementAgreementExecuted)
    blockedBy.push("TSR 310.4(a)(5)(i)(A): no executed settlement agreement");
  if (!input.termsApprovedByClient)
    blockedBy.push("TSR 310.4(a)(5)(i)(A): client has not approved the settlement terms");
  if (!input.firstSettlementPaymentMade)
    blockedBy.push("TSR 310.4(a)(5)(i)(B): client has not made a payment under the settlement");
  return { allowed: blockedBy.length === 0, blockedBy };
}

/** Dedicated account requirements (TSR 310.4(a)(5)(ii)). Ledger validates the
 *  partner bank account against these on enrollment and continuously. */
export const DEDICATED_ACCOUNT_REQUIREMENTS = [
  "Held at an insured financial institution (FDIC member)",
  "Owned by the client, who controls all funds",
  "Client may withdraw all funds at any time without penalty",
  "The account provider is not owned by, controlled by, or affiliated with X Debt",
  "The account provider does not pay X Debt referral fees for client accounts",
] as const;

/** TCPA calling-hours check for client-facing voice agents (local time). */
export function withinCallingHours(localHour: number): boolean {
  return localHour >= 8 && localHour < 21; // 8:00 AM – 9:00 PM local time
}

/** Statements no X Debt agent may ever make. Sentinel screens every
 *  outbound utterance/draft against these categories before delivery. */
export const PROHIBITED_CLAIMS = [
  "Guaranteeing that any specific debt will be settled or at any specific percentage",
  "Claiming the program will not affect the client's credit score",
  "Claiming creditors are required to negotiate or accept a settlement",
  "Advising a client to ignore a lawsuit, summons, or legal notice",
  "Providing legal or tax advice (refer to a licensed professional)",
  "Representing X Debt as a government program or nonprofit credit counselor",
  "Collecting or requesting any fee before the TSR fee gate passes",
] as const;

/** Phase gates: what may be discussed or executed at each client phase. */
export const PHASE_PERMISSIONS: Record<ClientPhase, string[]> = {
  prospect: ["general program education", "eligibility screening", "TSR disclosures"],
  intake: ["debt verification", "budget analysis", "enrollment agreement (ESIGN)", "dedicated account setup"],
  "enrolled-saving": ["draft schedule management", "creditor communications", "hardship adjustments"],
  negotiating: ["settlement offers", "client approval requests", "counteroffer strategy"],
  settling: ["settlement execution", "payment release (client-authorized)", "fee collection (post fee-gate only)"],
  graduated: ["completion letters", "credit-rebuilding education"],
  withdrawn: ["refund of dedicated-account balance confirmation", "exit paperwork"],
};

/** State licensing registry stub — real deployments load this from the
 *  compliance database. Enrollment is blocked in states where X Debt is not
 *  licensed or where debt settlement is prohibited. */
export function isServiceableState(stateCode: string): boolean {
  const PROHIBITED_OR_UNLICENSED = new Set(["GA", "NJ", "ND", "WV", "WY"]);
  return !PROHIBITED_OR_UNLICENSED.has(stateCode.toUpperCase());
}

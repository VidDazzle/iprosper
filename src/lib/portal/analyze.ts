/**
 * AI document analysis. When a client uploads a document, the relevant
 * specialized agent inspects it and decides what happens next — classify it,
 * extract the key facts, and (when the document calls for a decision) create an
 * approval request routed to the client.
 *
 * This implementation classifies deterministically from the declared type and
 * filename/text signals so it runs without external calls. The return shape is
 * exactly what a model-backed analyzer would produce, so swapping in a real LLM
 * (Atlas' extraction prompt) is a drop-in change at analyzeDocument().
 */

import type { AgentId } from "@/lib/agents/types";

export type DocCategory =
  | "creditor_statement"
  | "settlement_letter"
  | "legal_notice"
  | "collection_letter"
  | "pay_stub"
  | "bank_statement"
  | "id_document"
  | "unknown";

export interface DocAnalysis {
  category: DocCategory;
  agent: AgentId;
  agentName: string;
  findings: string[];
  recommendedAction: string;
  priority: "normal" | "high" | "urgent";
  /** If set, an approval request should be created and sent to the client. */
  approval?: {
    title: string;
    detail: string;
    amount?: number;
    creditor?: string;
  };
}

const AGENT_NAMES: Record<AgentId, string> = {
  aria: "Aria", atlas: "Atlas", nova: "Nova", ledger: "Ledger", sentinel: "Sentinel",
  echo: "Echo", sage: "Sage", pulse: "Pulse", guardian: "Guardian", beacon: "Beacon", chronos: "Chronos",
};

const SIGNALS: { category: DocCategory; keywords: RegExp }[] = [
  { category: "settlement_letter", keywords: /settle|settlement|offer|payoff|resolve.*account|accept.*payment/i },
  { category: "legal_notice", keywords: /summons|complaint|lawsuit|court|civil action|garnish|subpoena|notice of hearing/i },
  { category: "collection_letter", keywords: /collection|past due|final notice|debt collector|validation notice/i },
  { category: "creditor_statement", keywords: /statement|minimum payment|apr|billing|balance|card ending/i },
  { category: "pay_stub", keywords: /pay ?stub|payroll|earnings|gross pay|net pay|ytd/i },
  { category: "bank_statement", keywords: /bank statement|checking|savings|deposit|withdrawal|routing/i },
  { category: "id_document", keywords: /driver.?s license|passport|state id|identification/i },
];

/** Pull a dollar amount and a creditor-ish name from a text hint, if present. */
function extractAmount(text: string): number | undefined {
  const m = text.match(/\$?\s?([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{3,6})(?:\.\d{2})?/);
  if (!m) return undefined;
  const n = Number(m[1].replace(/,/g, ""));
  return Number.isFinite(n) ? n : undefined;
}

function classify(declaredType: string | undefined, fileName: string, textHint = ""): DocCategory {
  const hay = `${declaredType ?? ""} ${fileName} ${textHint}`;
  for (const s of SIGNALS) if (s.keywords.test(hay)) return s.category;
  return "unknown";
}

export function analyzeDocument(input: {
  declaredType?: string;
  fileName: string;
  /** Optional extracted text or client note to sharpen classification. */
  textHint?: string;
}): DocAnalysis {
  const category = classify(input.declaredType, input.fileName, input.textHint);
  const amount = extractAmount(`${input.fileName} ${input.textHint ?? ""}`);
  const creditorMatch = `${input.fileName} ${input.textHint ?? ""}`.match(
    /chase|citi|capital ?one|discover|amex|american express|synchrony|bank of america|portfolio recovery|midland|lvnv/i
  );
  const creditor = creditorMatch ? creditorMatch[0] : undefined;

  switch (category) {
    case "settlement_letter":
      return {
        category, agent: "nova", agentName: AGENT_NAMES.nova,
        findings: [
          `Detected a settlement offer${creditor ? ` from ${creditor}` : ""}.`,
          amount ? `Proposed settlement amount: $${amount.toLocaleString()}.` : "Settlement amount to be confirmed.",
          "Sentinel will verify the letter states the account is resolved in full before any payment.",
        ],
        recommendedAction: "Verify terms and request client approval to accept the settlement.",
        priority: "high",
        approval: {
          title: `Approve settlement${creditor ? ` with ${creditor}` : ""}`,
          detail: amount
            ? `Nova received a settlement offer of $${amount.toLocaleString()}. Approving authorizes releasing this amount from your dedicated account to resolve the account in full.`
            : "Nova received a settlement offer. Approving authorizes accepting the settlement once Sentinel verifies the written terms.",
          amount,
          creditor,
        },
      };
    case "legal_notice":
      return {
        category, agent: "guardian", agentName: AGENT_NAMES.guardian,
        findings: [
          "This appears to be a legal notice or lawsuit. This is time-sensitive.",
          "Guardian is calendaring the response deadline and preparing an attorney referral.",
          "Do NOT ignore a summons — a licensed consumer attorney will be connected within 24 hours.",
        ],
        recommendedAction: "Escalate to Guardian; connect client to a licensed consumer attorney within 24 hours.",
        priority: "urgent",
        approval: {
          title: "Confirm attorney referral",
          detail:
            "Guardian detected a legal notice on your account. Approve to have us connect you with an independent licensed consumer attorney from our network (no cost to review your options).",
          creditor,
        },
      };
    case "collection_letter":
      return {
        category, agent: "guardian", agentName: AGENT_NAMES.guardian,
        findings: [
          `Collection notice detected${creditor ? ` from ${creditor}` : ""}.`,
          "Guardian will check the notice for FDCPA violations and log it.",
          "Pulse will re-score litigation risk on this account.",
        ],
        recommendedAction: "Log collection contact, check FDCPA compliance, prioritize for negotiation.",
        priority: "high",
      };
    case "creditor_statement":
      return {
        category, agent: "atlas", agentName: AGENT_NAMES.atlas,
        findings: [
          `Classified as a creditor statement${creditor ? ` (${creditor})` : ""}.`,
          amount ? `Balance read: $${amount.toLocaleString()}.` : "Balance extracted for the negotiation dossier.",
          "Added to your debt dossier; Nova's negotiation strategy updated.",
        ],
        recommendedAction: "Add to debt dossier and update negotiation strategy. No client action needed.",
        priority: "normal",
      };
    case "pay_stub":
      return {
        category, agent: "aria", agentName: AGENT_NAMES.aria,
        findings: ["Income document received.", "Aria will re-verify your budget and confirm your deposit is affordable."],
        recommendedAction: "Re-verify budget and deposit affordability.",
        priority: "normal",
      };
    case "bank_statement":
      return {
        category, agent: "ledger", agentName: AGENT_NAMES.ledger,
        findings: ["Bank statement received.", "Ledger will reconcile against your dedicated-account deposit schedule."],
        recommendedAction: "Reconcile against dedicated-account deposits.",
        priority: "normal",
      };
    case "id_document":
      return {
        category, agent: "sentinel", agentName: AGENT_NAMES.sentinel,
        findings: ["Identity document received.", "Stored securely (encrypted) for identity verification only."],
        recommendedAction: "Complete identity verification; restrict access per GLBA.",
        priority: "normal",
      };
    default:
      return {
        category: "unknown", agent: "atlas", agentName: AGENT_NAMES.atlas,
        findings: [
          "Document received. Atlas could not confidently classify it from the file alone.",
          "It has been queued for a closer look; Sage will follow up if anything is needed.",
        ],
        recommendedAction: "Queue for manual/agent review; follow up with client if clarification needed.",
        priority: "normal",
      };
  }
}

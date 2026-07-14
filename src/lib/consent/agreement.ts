/**
 * The disclosure + hold-harmless agreement a consumer must sign BEFORE using any
 * analysis tool or checking out.
 *
 * It states, in plain terms, the facts the consumer is acknowledging: we analyze
 * and provide intelligence only (no recommendations, no legal/medical advice);
 * acting on the information is at their own risk; they may need to seek legal
 * representation first; no professional relationship is created; and they release
 * and hold VidDazzle LLC harmless. Bump AGREEMENT_VERSION whenever the terms
 * change — an old signature no longer satisfies the current version.
 */

import { ADVOCATE_STANCE } from "@/lib/advocacy";

export const AGREEMENT_VERSION = "2026-07-14";
export const AGREEMENT_TITLE = "Disclosure, Acknowledgment & Release";

export interface Acknowledgment {
  id: string;
  label: string;
}

/** Every box must be checked to sign. IDs are stored with the signature. */
export const REQUIRED_ACKS: Acknowledgment[] = [
  {
    id: "intelligence_only",
    label:
      "This service analyzes information and provides intelligence only. It does not make recommendations and does not provide legal, medical, tax, financial, or insurance advice.",
  },
  {
    id: "own_risk",
    label:
      "If I choose to act on any information this service provides, I understand I do so entirely at my own risk.",
  },
  {
    id: "seek_counsel",
    label:
      "I have been advised that I may need to consult a licensed attorney before moving forward or taking action, and that I should do so if anything seems questionable.",
  },
  {
    id: "no_relationship",
    label:
      "Using this service does not create an attorney–client, provider–patient, or fiduciary relationship. VidDazzle LLC is not a law firm, medical provider, or insurer.",
  },
  {
    id: "hold_harmless",
    label:
      "I release, waive, and agree to hold harmless VidDazzle LLC, its affiliates, and its agents from any and all claims, damages, or liability arising from my use of the service or any action I take based on the information it provides.",
  },
];

export const REQUIRED_ACK_IDS = REQUIRED_ACKS.map((a) => a.id);

/** True only if every required acknowledgment id is present. */
export function allAcksAccepted(ids: unknown): boolean {
  if (!Array.isArray(ids)) return false;
  const set = new Set(ids.map(String));
  return REQUIRED_ACK_IDS.every((id) => set.has(id));
}

/** Full readable disclosure (for the /legal page and the signing modal body). */
export const AGREEMENT_PARAGRAPHS: string[] = [
  `${ADVOCATE_STANCE}`,
  "What this service is. Our AI agents read the documents, bills, or contracts you provide and produce educational analysis — key points, things that may be worth questioning, comparisons, and general information about rights that may apply. This is intelligence to help you understand your own situation.",
  "What this service is not. It is not legal, medical, tax, financial, or insurance advice, and it is not a substitute for a licensed professional. We do not tell you what to do, we do not recommend one option over another, and we do not determine whether any charge, term, or document is or is not correct or enforceable. Laws differ by state and change over time, and a provider or counterparty may be able to justify something we flag.",
  "At your own risk. The decision to act — to pay, to dispute, to sign, to cancel, to litigate, or to do nothing — is entirely yours. If you act on information this service provides, you do so at your own risk. You are responsible for verifying anything important before you rely on it.",
  "You may need an attorney. You have been advised that you may need to consult a licensed attorney (or other appropriate licensed professional) before moving forward, and that you should do so if anything about your situation seems questionable, time-sensitive, or significant. Any attorney listings we show are paid advertisements; we do not recommend or endorse any attorney.",
  "Release and hold harmless. To the fullest extent permitted by law, you release, waive, and agree to hold harmless VidDazzle LLC, its affiliates, officers, agents, and its AI systems from any and all claims, losses, damages, or liability arising out of or relating to your use of the service or any action or inaction you take based on the information it provides. The service is provided \"as is,\" without warranties of any kind.",
  "Your documents. Documents and figures you submit for analysis are processed in memory and discarded — we do not store the files. We do keep a record of this signed acknowledgment (your name, the version you signed, and the date and time) as proof of consent.",
  "By typing your name and accepting below, you confirm that you have read and understood this disclosure, that you agree to it, and that you are electronically signing it.",
];

import type { OpportunityCandidate } from "@apex/contracts";

/**
 * Neither the confidence-weight numbers nor the infra-reuse-penalty
 * curve are specified in the spec — only the formula shape:
 * "score = (estimated monthly revenue potential × confidence) /
 * (estimated build hours + infra reuse penalty)". These are
 * placeholders, env-overridable, flagged the same way the rebalance
 * thresholds and stage costs are. A human should set real values
 * before Scout's scores drive real prioritization.
 */
export const CONFIDENCE_WEIGHT: Record<"low" | "med" | "high", number> = {
  low: Number(process.env.SCOUT_CONFIDENCE_WEIGHT_LOW ?? 0.3),
  med: Number(process.env.SCOUT_CONFIDENCE_WEIGHT_MED ?? 0.6),
  high: Number(process.env.SCOUT_CONFIDENCE_WEIGHT_HIGH ?? 1.0),
};

const BASE_INFRA_PENALTY = Number(process.env.SCOUT_BASE_INFRA_PENALTY ?? 40);
const PER_REUSE_CREDIT = Number(process.env.SCOUT_PER_REUSE_CREDIT ?? 8);

export const SCOUT_SCORE_THRESHOLD = Number(process.env.SCOUT_SCORE_THRESHOLD ?? 1);

/**
 * "infra reuse penalty": each piece of APEX infra a candidate can
 * reuse (existing pipeline stages, existing packages, existing
 * provider integrations) reduces the effective penalty, floored at 0.
 * Interpreted as "penalty for what ISN'T reusable," not a penalty for
 * reuse itself — more reuse -> lower penalty -> higher score.
 */
export function infraReusePenalty(infraReuse: string[]): number {
  return Math.max(0, BASE_INFRA_PENALTY - infraReuse.length * PER_REUSE_CREDIT);
}

export interface ConfidenceCapResult {
  confidence: "low" | "med" | "high";
  capped: boolean;
}

const BASIS_KEYWORDS = ["comparable", "data", "historical", "apex", "market", "benchmark"];
const MIN_BASIS_LENGTH = 20;

/**
 * "Confidence must show its basis... or gets capped at low confidence
 * — no unsupported projections pass the gate" (spec Section 10). This
 * can't judge whether a basis is actually TRUE, only whether it's
 * substantive enough to be checkable — a real human review still has
 * to look at confidenceBasis before approving anything.
 */
export function capConfidenceToEvidence(
  confidence: "low" | "med" | "high",
  confidenceBasis: string,
): ConfidenceCapResult {
  const basis = confidenceBasis.trim().toLowerCase();
  const hasSubstance =
    basis.length >= MIN_BASIS_LENGTH && BASIS_KEYWORDS.some((kw) => basis.includes(kw));

  if (!hasSubstance && confidence !== "low") {
    return { confidence: "low", capped: true };
  }
  return { confidence, capped: false };
}

export function computeScore(input: {
  estRevenueMonthly: number;
  confidence: "low" | "med" | "high";
  estBuildHours: number;
  infraReuse: string[];
}): number {
  const weight = CONFIDENCE_WEIGHT[input.confidence];
  const denominator = input.estBuildHours + infraReusePenalty(input.infraReuse);
  if (denominator <= 0) return 0;
  return (input.estRevenueMonthly * weight) / denominator;
}

export type CandidateInput = Omit<OpportunityCandidate, "id" | "status" | "score">;

/** Applies the evidence cap, then computes the final score off the (possibly capped) confidence. */
export function scoreCandidate(input: CandidateInput): { score: number; confidence: "low" | "med" | "high"; wasCapped: boolean } {
  const { confidence, capped } = capConfidenceToEvidence(input.confidence, input.confidenceBasis);
  const score = computeScore({ ...input, confidence });
  return { score, confidence, wasCapped: capped };
}

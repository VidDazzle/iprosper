import { prisma } from "@apex/db";
import { appendAuditLog } from "@apex/audit";
import { getQueue, QUEUE_NAMES } from "@apex/queue";
import { dispatch } from "@apex/dispatch";
import { scoreCandidate, SCOUT_SCORE_THRESHOLD } from "./scoring.js";
import type { SignalSource } from "./signalSource.js";

/**
 * "Scout runs across all engines, returns ranked opportunities by
 * expected-value-per-credit" (spec Section 1) / "never builds, only
 * surfaces" (Section 10). Persists every candidate (so low-scoring
 * ones are still visible for audit/tuning), but only enqueues an
 * owner-digest notification for ones clearing the threshold — nothing
 * here ever calls apex.dispatch(). See approveOpportunity() for the
 * only sanctioned path from candidate to real dispatch, and it
 * requires an explicit human actor.
 */
export async function runScout(sources: SignalSource[]) {
  const created: { id: string; name: string; score: number; aboveThreshold: boolean }[] = [];

  for (const source of sources) {
    const candidates = await source.gatherCandidates();

    for (const candidate of candidates) {
      const { score, confidence, wasCapped } = scoreCandidate(candidate);
      const aboveThreshold = score >= SCOUT_SCORE_THRESHOLD;

      const row = await prisma.opportunityCandidate.create({
        data: {
          name: candidate.name,
          category: candidate.category,
          estRevenueMonthly: candidate.estRevenueMonthly,
          confidence,
          confidenceBasis: candidate.confidenceBasis,
          estBuildHours: candidate.estBuildHours,
          infraReuse: candidate.infraReuse,
          score,
          complianceFlags: candidate.complianceFlags,
          status: "pending_review",
          sourceSignals: { source: source.name, confidenceWasCapped: wasCapped } as never,
        },
      });

      await appendAuditLog({
        actor: `scout:${source.name}`,
        action: "opportunity_candidate_created",
        target: row.id,
        detail: { score, confidence, wasCapped, aboveThreshold },
      });

      if (aboveThreshold) {
        await getQueue(QUEUE_NAMES.ownerDigest).add("opportunity-candidate", { candidateId: row.id });
      }

      created.push({ id: row.id, name: row.name, score, aboveThreshold });
    }
  }

  return created;
}

export class OpportunityNotApprovableError extends Error {
  constructor(candidateId: string, reason: string) {
    super(`Cannot approve candidate "${candidateId}": ${reason}`);
    this.name = "OpportunityNotApprovableError";
  }
}

export const CATEGORY_TO_ENGINE: Record<string, "client-acquisition" | "affiliate" | "evolve"> = {
  "new-vertical": "client-acquisition",
  "new-app": "evolve",
  "new-affiliate-program": "affiliate",
};

/**
 * The only sanctioned path from a Scout candidate to a real
 * apex.dispatch() registration (spec Section 10: "Approval is what
 * turns a candidate into a real apex.dispatch() registration"). No
 * auto-build ever — this requires an explicit human actor and an
 * explicit budgetCap; neither is inferred from the candidate's own
 * numbers, since estRevenueMonthly/estBuildHours are projections, not
 * a spending authorization.
 */
export async function approveOpportunity(
  candidateId: string,
  approvedBy: string,
  agentId: string,
  budgetCap: number,
) {
  const candidate = await prisma.opportunityCandidate.findUnique({ where: { id: candidateId } });
  if (!candidate) throw new OpportunityNotApprovableError(candidateId, "not found");
  if (candidate.status !== "pending_review") {
    throw new OpportunityNotApprovableError(candidateId, `status is "${candidate.status}", not "pending_review"`);
  }

  const engine = CATEGORY_TO_ENGINE[candidate.category];
  if (!engine) throw new OpportunityNotApprovableError(candidateId, `unknown category "${candidate.category}"`);

  const job = await dispatch({
    agentId,
    engine,
    source: "scout-approved",
    task: { opportunityCandidateId: candidateId, name: candidate.name },
    budgetCap,
  });

  await prisma.opportunityCandidate.update({ where: { id: candidateId }, data: { status: "approved" } });

  await appendAuditLog({
    actor: approvedBy,
    action: "opportunity_approved",
    target: candidateId,
    detail: { dispatchJobId: job.id, agentId, engine, budgetCap },
  });

  return job;
}

export async function rejectOpportunity(candidateId: string, rejectedBy: string, reason: string) {
  await prisma.opportunityCandidate.update({ where: { id: candidateId }, data: { status: "rejected" } });
  await appendAuditLog({
    actor: rejectedBy,
    action: "opportunity_rejected",
    target: candidateId,
    detail: { reason },
  });
}

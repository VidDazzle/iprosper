import { prisma } from "@apex/db";
import type { OpportunityCandidate } from "@apex/contracts";

/**
 * apex.scan() — spec Section 1: "Scout runs across all engines, returns
 * ranked opportunities by expected-value-per-credit". Scout's actual
 * scoring engine is Phase 4; this reads whatever OpportunityCandidate
 * rows already exist (score = estRevenueMonthly*confidence /
 * (buildHours + infraReusePenalty), computed by Scout) ranked
 * descending. Until Scout is built this correctly returns an empty
 * list rather than fabricating opportunities.
 */
export async function scan(): Promise<OpportunityCandidate[]> {
  const rows = await prisma.opportunityCandidate.findMany({
    where: { status: "pending_review" },
    orderBy: { score: "desc" },
  });

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    category: r.category as OpportunityCandidate["category"],
    estRevenueMonthly: Number(r.estRevenueMonthly),
    confidence: r.confidence as OpportunityCandidate["confidence"],
    confidenceBasis: r.confidenceBasis,
    estBuildHours: Number(r.estBuildHours),
    infraReuse: r.infraReuse,
    score: Number(r.score),
    complianceFlags: r.complianceFlags,
    status: "pending_review" as const,
  }));
}

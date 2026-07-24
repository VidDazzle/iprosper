import { prisma } from "@apex/db";
import type { Engine } from "@apex/contracts";

/**
 * Real closed-client count for an engine — not a fabricated traffic or
 * revenue percentage. Nothing in this system measures a client's own
 * site traffic or business revenue after they buy (that would need a
 * separate analytics integration on the delivered site plus the
 * client's consent to track and share it — not built). This is the
 * one honest, already-available number: how many businesses on this
 * engine actually paid an invoice.
 *
 * Gated by a minimum sample size, same reasoning as Scout's
 * capConfidenceToEvidence — a single early client shouldn't be dressed
 * up as "join dozens of businesses."
 */
const MIN_SAMPLE_SIZE = Number(process.env.SOCIAL_PROOF_MIN_SAMPLE ?? 10);

export interface SocialProofStat {
  closedClientCount: number;
  eligible: boolean;
}

export async function getSocialProofStat(engine: Engine): Promise<SocialProofStat> {
  const closedClientCount = await prisma.dispatchJob.count({ where: { engine, invoicePaid: true } });
  return { closedClientCount, eligible: closedClientCount >= MIN_SAMPLE_SIZE };
}

/** Pure formatting step, split out for unit testing without a DB. */
export function socialProofBullet(stat: SocialProofStat): string | null {
  if (!stat.eligible) return null;
  return `${stat.closedClientCount}+ businesses like yours are already live on this`;
}

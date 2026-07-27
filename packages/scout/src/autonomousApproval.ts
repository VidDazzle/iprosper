import { prisma } from "@apex/db";
import { appendAuditLog } from "@apex/audit";
import { loadEnv, isAutonomousApprovalLive, buildApprovalUrl } from "@apex/config";
import { notifyOwner } from "@apex/owner-alerts";
import { getRealizedUnitEconomics } from "@apex/spend";
import type { Engine } from "@apex/contracts";
import { approveOpportunity, CATEGORY_TO_ENGINE } from "./scout.js";
import { SCOUT_SCORE_THRESHOLD } from "./scoring.js";

const APPROVAL_REQUEST_RESEND_WINDOW_MS = 24 * 60 * 60 * 1000;
const APPROVAL_LINK_TTL_MS = 24 * 60 * 60 * 1000;
const ROLLING_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/** Pure predicate, split out for unit testing: score clears the bar AND nothing needs a human's eyes on it first. */
export function isAutonomouslyEligible(candidate: { score: number; complianceFlags: string[] }): boolean {
  return candidate.score >= SCOUT_SCORE_THRESHOLD && candidate.complianceFlags.length === 0;
}

/** Sum of budgetCap committed via autonomous (not human) approval in the trailing 7 days. */
export async function getRollingAutonomousSpend(now: Date = new Date()): Promise<number> {
  const windowStart = new Date(now.getTime() - ROLLING_WINDOW_MS);
  const entries = await prisma.auditLog.findMany({
    where: { action: "opportunity_approved", actor: "system:autonomous-approval", createdAt: { gte: windowStart } },
  });
  return entries.reduce((sum, entry) => {
    const detail = entry.detail as { budgetCap?: number } | null;
    return sum + (detail?.budgetCap ?? 0);
  }, 0);
}

/** Real, confirmed revenue in the trailing 7 days — what AUTONOMOUS_SPEND_PERCENT_OF_REVENUE scales the weekly ceiling against. */
export async function getRollingRealizedRevenue(now: Date = new Date()): Promise<number> {
  const windowStart = new Date(now.getTime() - ROLLING_WINDOW_MS);
  const result = await prisma.dispatchJob.aggregate({
    where: { invoicePaid: true, invoicePaidAt: { gte: windowStart } },
    _sum: { revenueAttributed: true },
  });
  return round2(Number(result._sum.revenueAttributed ?? 0));
}

export interface EffectiveDispatchCap {
  dispatchCap: number;
  dataDriven: boolean; // false = still on the fixed bootstrap floor, no real data yet
}

/**
 * Never risk more per autonomous candidate than
 * AUTONOMOUS_DISPATCH_PERCENT_OF_DEAL_VALUE of what an average closed
 * deal on THIS engine has actually been worth, once there's enough
 * history to trust it (packages/spend/unitEconomics.ts). Before that,
 * AUTONOMOUS_BOOTSTRAP_DISPATCH_CAP applies — a small fixed floor so
 * the system can spend something to acquire its first customers
 * before it has any real numbers to compute a percentage from.
 */
export async function getEffectiveDispatchCap(engine: Engine): Promise<EffectiveDispatchCap> {
  const env = loadEnv();
  const economics = await getRealizedUnitEconomics(engine);

  if (economics.eligible && economics.avgRevenuePerClose !== null) {
    return {
      dispatchCap: round2(economics.avgRevenuePerClose * env.AUTONOMOUS_DISPATCH_PERCENT_OF_DEAL_VALUE),
      dataDriven: true,
    };
  }

  return { dispatchCap: env.AUTONOMOUS_BOOTSTRAP_DISPATCH_CAP, dataDriven: false };
}

/**
 * "Full autonomy with hard caps," expressed as ratios rather than
 * fixed dollars (explicit decision: "expenses and revenue can
 * fluctuate... profit and revenue should always be expressed in a
 * percentage"). A pending Scout candidate that scores well AND
 * carries no compliance flags AND wouldn't push the rolling 7-day
 * autonomous spend over the (revenue-scaled) weekly ceiling
 * auto-dispatches at the engine's current effective per-candidate cap
 * — never the candidate's own revenue projection. Everything else
 * still needs a human, delivered as a one-click SMS/email link
 * proposing a multiple of that same effective cap. No-ops entirely
 * unless isAutonomousApprovalLive() (LIVE_MODE +
 * AUTONOMOUS_APPROVAL_ENABLED).
 */
export async function runAutonomousApprovalSweep() {
  if (!isAutonomousApprovalLive()) {
    return { autoApproved: [] as string[], requestsSent: [] as string[] };
  }

  const env = loadEnv();
  const candidates = await prisma.opportunityCandidate.findMany({
    where: { status: "pending_review" },
    orderBy: { score: "desc" },
  });

  const [rollingSpend, rollingRevenue] = await Promise.all([
    getRollingAutonomousSpend(),
    getRollingRealizedRevenue(),
  ]);
  const weeklyCap = Math.max(
    env.AUTONOMOUS_BOOTSTRAP_WEEKLY_CAP,
    round2(rollingRevenue * env.AUTONOMOUS_SPEND_PERCENT_OF_REVENUE),
  );

  let spentThisSweep = rollingSpend;
  const autoApproved: string[] = [];
  const requestsSent: string[] = [];
  const capCache = new Map<Engine, EffectiveDispatchCap>();

  for (const candidate of candidates) {
    const engine = CATEGORY_TO_ENGINE[candidate.category];
    if (!engine) continue; // unrecognized category — approveOpportunity would reject it; leave for human review as-is

    let caps = capCache.get(engine);
    if (!caps) {
      caps = await getEffectiveDispatchCap(engine);
      capCache.set(engine, caps);
    }

    const eligible = isAutonomouslyEligible({
      score: Number(candidate.score),
      complianceFlags: candidate.complianceFlags,
    });
    const withinWeeklyCap = spentThisSweep + caps.dispatchCap <= weeklyCap;

    if (eligible && withinWeeklyCap) {
      await approveOpportunity(
        candidate.id,
        "system:autonomous-approval",
        `scout-auto-${candidate.id}`,
        caps.dispatchCap,
      );
      spentThisSweep += caps.dispatchCap;
      autoApproved.push(candidate.id);
      continue;
    }

    const sent = await sendApprovalRequestIfDue(candidate.id, candidate.name, caps.dispatchCap);
    if (sent) requestsSent.push(candidate.id);
  }

  return { autoApproved, requestsSent };
}

/** Avoids re-sending the same request every cron tick — at most once per candidate per 24h. */
async function sendApprovalRequestIfDue(candidateId: string, name: string, referenceCap: number): Promise<boolean> {
  const recent = await prisma.auditLog.findFirst({
    where: {
      action: "approval_request_sent",
      target: candidateId,
      createdAt: { gte: new Date(Date.now() - APPROVAL_REQUEST_RESEND_WINDOW_MS) },
    },
  });
  if (recent) return false;

  const env = loadEnv();
  const escalationAmount = round2(referenceCap * env.AUTONOMOUS_ESCALATION_MULTIPLE);
  const expiresAt = new Date(Date.now() + APPROVAL_LINK_TTL_MS);
  const approveUrl = buildApprovalUrl(candidateId, "approve", expiresAt);
  const rejectUrl = buildApprovalUrl(candidateId, "reject", expiresAt);

  await notifyOwner(
    `APEX: approve "${name}"? ($${escalationAmount})`,
    [
      `Scout found an opportunity above the autonomous cap: "${name}".`,
      `Approve at $${escalationAmount}: ${approveUrl}`,
      `Reject: ${rejectUrl}`,
      `Link expires in 24h.`,
    ].join("\n"),
  );

  // The amount stated in the message above is what the link commits
  // to — stored here so the click handler (apps/web's approval route)
  // uses the SAME figure that was actually promised, not whatever the
  // effective cap happens to be by the time it's clicked.
  await appendAuditLog({
    actor: "system:autonomous-approval",
    action: "approval_request_sent",
    target: candidateId,
    detail: { escalationAmount },
  });

  return true;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

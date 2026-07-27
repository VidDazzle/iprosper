import { prisma } from "@apex/db";
import { appendAuditLog } from "@apex/audit";
import { loadEnv, isAutonomousApprovalLive, buildApprovalUrl } from "@apex/config";
import { notifyOwner } from "@apex/owner-alerts";
import { approveOpportunity } from "./scout.js";
import { SCOUT_SCORE_THRESHOLD } from "./scoring.js";

const APPROVAL_REQUEST_RESEND_WINDOW_MS = 24 * 60 * 60 * 1000;
const APPROVAL_LINK_TTL_MS = 24 * 60 * 60 * 1000;
const ROLLING_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/** Pure predicate, split out for unit testing: score clears the bar AND nothing needs a human's eyes on it first. */
export function isAutonomouslyEligible(candidate: { score: number; complianceFlags: string[] }): boolean {
  return candidate.score >= SCOUT_SCORE_THRESHOLD && candidate.complianceFlags.length === 0;
}

/** Sum of budgetCap committed via autonomous (not human) approval in the trailing 7 days — the portfolio-level hard cap's input. */
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

/**
 * "Full autonomy with hard caps" (explicit product decision, not
 * spec-defined): a pending Scout candidate that scores well AND
 * carries no compliance flags AND wouldn't push the rolling 7-day
 * autonomous spend over AUTONOMOUS_WEEKLY_SPEND_CAP auto-dispatches at
 * a FIXED AUTONOMOUS_DISPATCH_CAP — never the candidate's own revenue
 * projection (same reasoning approveOpportunity already applies to a
 * human-supplied budgetCap). Everything else still needs a human,
 * delivered as a one-click SMS/email link instead of requiring
 * dashboard login (sendApprovalRequestIfDue below). No-ops entirely
 * unless isAutonomousApprovalLive() (LIVE_MODE +
 * AUTONOMOUS_APPROVAL_ENABLED) — a fresh deploy never silently starts
 * committing autonomous spend.
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

  let rollingSpend = await getRollingAutonomousSpend();
  const autoApproved: string[] = [];
  const requestsSent: string[] = [];

  for (const candidate of candidates) {
    const eligible = isAutonomouslyEligible({
      score: Number(candidate.score),
      complianceFlags: candidate.complianceFlags,
    });

    if (eligible && rollingSpend + env.AUTONOMOUS_DISPATCH_CAP <= env.AUTONOMOUS_WEEKLY_SPEND_CAP) {
      await approveOpportunity(
        candidate.id,
        "system:autonomous-approval",
        `scout-auto-${candidate.id}`,
        env.AUTONOMOUS_DISPATCH_CAP,
      );
      rollingSpend += env.AUTONOMOUS_DISPATCH_CAP;
      autoApproved.push(candidate.id);
      continue;
    }

    const sent = await sendApprovalRequestIfDue(candidate.id, candidate.name);
    if (sent) requestsSent.push(candidate.id);
  }

  return { autoApproved, requestsSent };
}

/** Avoids re-sending the same request every cron tick — at most once per candidate per 24h. */
async function sendApprovalRequestIfDue(candidateId: string, name: string): Promise<boolean> {
  const recent = await prisma.auditLog.findFirst({
    where: {
      action: "approval_request_sent",
      target: candidateId,
      createdAt: { gte: new Date(Date.now() - APPROVAL_REQUEST_RESEND_WINDOW_MS) },
    },
  });
  if (recent) return false;

  const env = loadEnv();
  const expiresAt = new Date(Date.now() + APPROVAL_LINK_TTL_MS);
  const approveUrl = buildApprovalUrl(candidateId, "approve", expiresAt);
  const rejectUrl = buildApprovalUrl(candidateId, "reject", expiresAt);

  await notifyOwner(
    `APEX: approve "${name}"? ($${env.AUTONOMOUS_ESCALATION_CAP})`,
    [
      `Scout found an opportunity above the autonomous cap: "${name}".`,
      `Approve at $${env.AUTONOMOUS_ESCALATION_CAP}: ${approveUrl}`,
      `Reject: ${rejectUrl}`,
      `Link expires in 24h.`,
    ].join("\n"),
  );

  await appendAuditLog({
    actor: "system:autonomous-approval",
    action: "approval_request_sent",
    target: candidateId,
    detail: { escalationCap: env.AUTONOMOUS_ESCALATION_CAP },
  });

  return true;
}

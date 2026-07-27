import { prisma } from "@apex/db";
import { appendAuditLog } from "@apex/audit";
import { getQueue, QUEUE_NAMES } from "@apex/queue";
import { closerJobId, closerEscalationJobId, nurtureJobId, NURTURE_DAYS } from "./jobIds.js";

/**
 * Spec Section 7: "revoked consent cancels the whole queue
 * immediately." Removes every deterministically-IDed Closer/nurture
 * job for this lead and marks it revoked so any in-flight processor
 * also bails (belt-and-suspenders — a job already pulled off the
 * queue for processing won't be caught by queue.remove()).
 */
export async function revokeConsent(leadId: string, actor: string) {
  const lead = await prisma.lead.update({
    where: { id: leadId },
    data: { status: "revoked", consentRevokedAt: new Date() },
  });

  const closerQueue = getQueue(QUEUE_NAMES.closerDispatch);
  const nurtureQueue = getQueue(QUEUE_NAMES.nurtureDispatch);

  await Promise.all([
    ...[1, 2, 3].map((seq) => closerQueue.remove(closerJobId(leadId, seq))),
    closerQueue.remove(closerEscalationJobId(leadId)),
    ...NURTURE_DAYS.map((day) => nurtureQueue.remove(nurtureJobId(leadId, day))),
  ]);

  await appendAuditLog({
    actor,
    action: "consent_revoked",
    target: leadId,
    detail: {},
  });

  return lead;
}

/** Every Closer/nurture touch handler should bail if this returns false — belt-and-suspenders against a race with revokeConsent. */
export function isConsentActive(lead: { status: string; consentRevokedAt: Date | null }): boolean {
  return lead.status !== "revoked" && lead.status !== "erased" && !lead.consentRevokedAt;
}

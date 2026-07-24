import { prisma } from "@apex/db";
import { appendAuditLog } from "@apex/audit";
import { getQueue, QUEUE_NAMES } from "@apex/queue";

export interface CaptureLeadInput {
  jobId: string;
  name: string;
  email: string;
  phone?: string;
  /** The exact consent copy shown to and explicitly agreed to by the prospect — never a pre-checked default. */
  consentText: string;
}

export class MissingConsentError extends Error {
  constructor() {
    super("Cannot capture a lead without explicit consent text — a pre-checked or absent consent is not consent.");
    this.name = "MissingConsentError";
  }
}

/**
 * "On lead unlock: write Lead row, fire webhook to Closer + owner
 * digest" (spec Section 4, step 5/NOTIFY). Triggered by the lead-gate
 * form submission in apps/web, not automatically chained after VOICE —
 * a prospect has to actually unlock before any of this fires.
 */
export async function captureLead(input: CaptureLeadInput) {
  if (!input.consentText || input.consentText.trim().length === 0) {
    throw new MissingConsentError();
  }

  const consentTimestamp = new Date();

  const lead = await prisma.lead.create({
    data: {
      jobId: input.jobId,
      name: input.name,
      email: input.email,
      phone: input.phone,
      consentTimestamp,
      consentText: input.consentText,
      source: "rebrand-engine-preview",
      status: "active",
    },
  });

  await prisma.dispatchJob.update({
    where: { id: input.jobId },
    data: { leadId: lead.id, stage: "notify" },
  });

  await appendAuditLog({
    actor: "system:notify",
    action: "lead_captured",
    target: lead.id,
    detail: { jobId: input.jobId, consentTimestamp: consentTimestamp.toISOString() },
  });

  // Closer must contact within 5 minutes of unlock (spec Section 6).
  // The actual send is LIVE_MODE-gated inside the Closer consumer, not here.
  await getQueue(QUEUE_NAMES.closerDispatch).add("first-touch", { leadId: lead.id, sequence: 1 });

  await getQueue(QUEUE_NAMES.ownerDigest).add("lead-captured", { leadId: lead.id, jobId: input.jobId });

  return lead;
}

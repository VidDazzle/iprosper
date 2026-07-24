import { prisma } from "@apex/db";
import { appendAuditLog } from "@apex/audit";
import { isChannelLive } from "@apex/config";
import { getQueue, QUEUE_NAMES } from "@apex/queue";
import { isConsentActive } from "./consent.js";
import { NURTURE_DAYS, nurtureJobId } from "./jobIds.js";

const DORMANT_DAY = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Spec Section 7: "Each stage is a BullMQ job keyed to consent
 * timestamp." Delays are computed from consentTimestamp, not from
 * "now" — a nurture queue started late (e.g. after a slow Closer
 * escalation) still lands on the same absolute days.
 */
export async function startNurtureQueue(leadId: string) {
  const lead = await prisma.lead.findUniqueOrThrow({ where: { id: leadId } });

  await prisma.lead.update({ where: { id: leadId }, data: { status: "nurture" } });

  const queue = getQueue(QUEUE_NAMES.nurtureDispatch);
  const now = Date.now();
  const consentMs = lead.consentTimestamp.getTime();

  for (const day of NURTURE_DAYS) {
    const fireAt = consentMs + day * DAY_MS;
    const delay = Math.max(0, fireAt - now);
    await queue.add("nurture-touch", { leadId, day }, { jobId: nurtureJobId(leadId, day), delay });
  }

  const dormantDelay = Math.max(0, consentMs + DORMANT_DAY * DAY_MS - now);
  await queue.add(
    "nurture-dormant",
    { leadId },
    { jobId: nurtureJobId(leadId, DORMANT_DAY), delay: dormantDelay },
  );

  await appendAuditLog({ actor: "system:nurture", action: "nurture_started", target: leadId, detail: {} });
}

async function recordAndMaybeSend(leadId: string, channel: "sms" | "email", day: number, content: string) {
  await prisma.touch.create({
    data: { leadId, phase: "nurture", channel, sequence: day, sentAt: new Date() },
  });

  if (isChannelLive(channel)) {
    throw new Error(
      `${channel.toUpperCase()}_ENABLED is true but no ${channel} provider is configured in this build — refusing to fake a send.`,
    );
  }

  console.info(`[nurture:dry-run] would send ${channel} (day ${day}) to lead ${leadId}:\n${content}`);
}

/** BullMQ processor entry point for the nurture-dispatch queue's "nurture-touch" jobs. */
export async function processNurtureTouch(leadId: string, day: number) {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { job: { include: { brandKit: true, previewResult: true } } },
  });
  if (!lead || !isConsentActive(lead)) return;
  if (!lead.job?.brandKit || !lead.job.previewResult) return;

  const businessName = lead.job.brandKit.name;
  const previewUrl = lead.job.previewResult.previewUrl;

  switch (day) {
    case 2:
      await recordAndMaybeSend(
        leadId,
        "sms",
        2,
        `No pressure at all — your ${businessName} preview is still here whenever you want another look: ${previewUrl}`,
      );
      break;
    case 5:
      await recordAndMaybeSend(
        leadId,
        "email",
        5,
        [
          `Thought you'd find this useful even if the timing isn't right yet:`,
          ``,
          `A real booking funnel — like your preview — is what Google and AI search tools reward with visibility now, since a lot of local searches get answered by an AI summary instead of a list of links.`,
          ``,
          `No action needed — just reply if you have questions.`,
        ].join("\n"),
      );
      break;
    case 9: {
      const valueNugget = lead.job.brandKit.services[0]
        ? `One thing that stood out from your site: your "${lead.job.brandKit.services[0]}" page could be doing a lot more to convert.`
        : `One thing that stood out from your site: there's a real opportunity to convert more visitors into booked calls.`;
      await recordAndMaybeSend(leadId, "sms", 9, `${valueNugget} Worth a quick look together?`);
      break;
    }
    case 13:
      await recordAndMaybeSend(
        leadId,
        "email",
        13,
        [
          `Just closing the loop — no hard sell here.`,
          ``,
          `Your preview is still available if you'd ever like to revisit it: ${previewUrl}`,
          ``,
          `Wishing you the best either way.`,
        ].join("\n"),
      );
      break;
  }
}

/** BullMQ processor entry point for the nurture-dispatch queue's "nurture-dormant" job (day 14). */
export async function processNurtureDormant(leadId: string) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead || !isConsentActive(lead)) return;

  await prisma.lead.update({ where: { id: leadId }, data: { status: "dormant" } });
  await appendAuditLog({ actor: "system:nurture", action: "lead_dormant", target: leadId, detail: {} });
}

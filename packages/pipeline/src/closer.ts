import { prisma } from "@apex/db";
import { appendAuditLog } from "@apex/audit";
import { isChannelLive } from "@apex/config";
import { getQueue, QUEUE_NAMES } from "@apex/queue";
import { isConsentActive } from "./consent.js";
import { closerJobId, closerEscalationJobId } from "./jobIds.js";
import { getSocialProofStat, socialProofBullet } from "./socialProof.js";
import type { Engine } from "@apex/contracts";
import type { TemplateKey } from "@apex/renderer/src/selectTemplate.js";

const TOUCH_DELAYS_MS = {
  // Spec only pins down email at "T+2h if unanswered." The SMS-first /
  // voice-second gap is NOT specified numerically — placeholder, flagged
  // the same way the rebalance thresholds are. Env-overridable.
  voiceAfterSmsMs: Number(process.env.CLOSER_VOICE_DELAY_MS ?? 60 * 60 * 1000), // +1h
  emailAfterFirstTouchMs: Number(process.env.CLOSER_EMAIL_DELAY_MS ?? 2 * 60 * 60 * 1000), // +2h, spec-defined
  escalationWindowMs: 48 * 60 * 60 * 1000, // spec Section 6: "3 touches over 48 hours"
} as const;

// Applies across every vertical — true of the rebuild itself, not
// vertical-specific. Deliberately no invented traffic/revenue
// percentage (see packages/digest client-outcome stat once real
// closed deals exist to compute one from).
const SEARCH_VISIBILITY_BULLET =
  "Built to show up in modern search — Google and AI search tools like ChatGPT and Google's AI Overviews, not just old-school SEO";

const VERTICAL_BULLETS: Record<TemplateKey, string[]> = {
  luxe: [
    "A booking flow built for how clients actually decide — not just a contact form",
    "Before/after storytelling that matches how your best results already convert in person",
    "Review and referral capture built into every visit, not bolted on after",
  ],
  built: [
    "An estimate flow that qualifies leads before they hit your phone",
    "Financing calculator so price stops being the first objection",
    "A project gallery that closes the trust gap faster than testimonials alone",
  ],
  destination: [
    "Real-time availability instead of a static contact page",
    "A concierge inquiry flow that pre-qualifies serious interest",
    "Gallery and map experience built for how people actually browse before booking",
  ],
};

export function buildSmsMessage(businessName: string, previewUrl: string): string {
  return `Hey! This is APEX — I put together a rebrand preview for ${businessName}: ${previewUrl}\n\nReply YES if you'd like a quick call, or ask me anything right here.`;
}

export function buildEmailMessage(
  businessName: string,
  previewUrl: string,
  vertical: TemplateKey,
  schedulingLink: string,
  socialProof: string | null = null,
): { subject: string; body: string } {
  const bullets = [...VERTICAL_BULLETS[vertical], SEARCH_VISIBILITY_BULLET];
  if (socialProof) bullets.push(socialProof);
  return {
    subject: `Your ${businessName} preview is still up`,
    body: [
      `Your rebrand preview is still live: ${previewUrl}`,
      ``,
      `What a real launch actually includes:`,
      ...bullets.map((b) => `- ${b}`),
      ``,
      `One new customer from this usually covers what it costs many times over.`,
      ``,
      `Want to talk through it? Grab a time here: ${schedulingLink}`,
    ].join("\n"),
  };
}

export interface VoiceScript {
  opening: string;
  valueFrame: string;
  discoveryQuestion: string;
  bridgingGuidance: string;
  objectionHandling: Record<string, string>;
  closeAsk: string;
}

/**
 * Spec Section 6. This is guidance content for whoever/whatever places
 * the call (a human closer or a future AI voice agent) — not literal
 * text to read verbatim, since the bridging step is explicitly
 * contextual ("bridge their answer directly to the matching tier").
 */
export function buildVoiceScript(businessName: string): VoiceScript {
  return {
    opening: `Confirm you're speaking with the right person, then reference the ${businessName} preview specifically — not a generic pitch.`,
    valueFrame: `Point at what the preview doesn't show: the booking flow, financing calculator, or real-time availability — plus that it's built for how people search now (Google and AI search tools, not just old SEO) — tied to a concrete outcome (e.g. "clients qualify themselves before they call you"). Never quote a specific traffic or revenue percentage — nothing in this system measures the client's own results yet.`,
    discoveryQuestion: `Ask one open question about what's actually costing them leads or bookings today, then stop talking and listen.`,
    bridgingGuidance: `Bridge their answer directly to the tier that solves THAT problem. Never pitch a tier they didn't ask for.`,
    objectionHandling: {
      "need to think about it": "Ask what specifically — price, timing, or design. Then stop selling and listen.",
      "how much": "Give the real price immediately. No lowballing.",
    },
    closeAsk: `Close with a low-friction next step (not a hard close) — e.g. "Want me to hold this preview and send the estimate?"`,
  };
}

/**
 * Records the touch and, in LIVE_MODE, actually sends it. There is no
 * SMS/email/voice provider wired up in this build — LIVE_MODE=true
 * without one fails loud (throws) rather than silently no-op'ing, per
 * the standing instruction to never let a "live" code path quietly do
 * nothing. Dry-run just logs and records the Touch row for review.
 */
async function recordAndMaybeSend(
  leadId: string,
  channel: "sms" | "voice" | "email",
  sequence: number,
  content: string,
) {
  await prisma.touch.create({
    data: { leadId, phase: "closer", channel, sequence, sentAt: new Date() },
  });

  if (isChannelLive(channel)) {
    throw new Error(
      `${channel.toUpperCase()}_ENABLED is true but no ${channel} provider is configured in this build — refusing to fake a send. Wire a real provider before enabling this channel.`,
    );
  }

  console.info(`[closer:dry-run] would send ${channel} touch #${sequence} to lead ${leadId}:\n${content}`);
}

async function scheduleNext(leadId: string, sequence: number, delayMs: number) {
  await getQueue(QUEUE_NAMES.closerDispatch).add(
    "touch",
    { leadId, sequence },
    { jobId: closerJobId(leadId, sequence), delay: delayMs },
  );
}

async function scheduleEscalationCheck(leadId: string) {
  await getQueue(QUEUE_NAMES.closerDispatch).add(
    "escalation-check",
    { leadId },
    { jobId: closerEscalationJobId(leadId), delay: TOUCH_DELAYS_MS.escalationWindowMs },
  );
}

/** BullMQ processor entry point for the closer-dispatch queue's "touch" jobs. */
export async function processCloserTouch(leadId: string, sequence: number) {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { job: { include: { brandKit: true, previewResult: true, mockSite: true } } },
  });
  if (!lead || !isConsentActive(lead)) return;
  if (!lead.job?.brandKit || !lead.job.previewResult) return;

  const businessName = lead.job.brandKit.name;
  // The Gemini/Netlify mock site is the stronger pitch when it's actually
  // live (real per-prospect hosted URL); falls back to the APEX-hosted
  // preview whenever Gemini/Netlify aren't configured or LIVE_MODE is off.
  const previewUrl = lead.job.mockSite?.siteUrl ?? lead.job.previewResult.previewUrl;

  if (sequence === 1) {
    await recordAndMaybeSend(leadId, "sms", 1, buildSmsMessage(businessName, previewUrl));
    await scheduleNext(leadId, 2, TOUCH_DELAYS_MS.voiceAfterSmsMs);
  } else if (sequence === 2) {
    const script = buildVoiceScript(businessName);
    await recordAndMaybeSend(leadId, "voice", 2, JSON.stringify(script, null, 2));
    const emailDelay = Math.max(0, TOUCH_DELAYS_MS.emailAfterFirstTouchMs - TOUCH_DELAYS_MS.voiceAfterSmsMs);
    await scheduleNext(leadId, 3, emailDelay);
  } else if (sequence === 3) {
    const vertical = await resolveVertical(lead.job.id);
    const proof = await getSocialProofStat(lead.job.engine as Engine);
    const email = buildEmailMessage(
      businessName,
      previewUrl,
      vertical,
      schedulingLinkFor(leadId),
      socialProofBullet(proof),
    );
    await recordAndMaybeSend(leadId, "email", 3, `${email.subject}\n\n${email.body}`);
    await scheduleEscalationCheck(leadId);
  }
}

/** BullMQ processor entry point for the closer-dispatch queue's "escalation-check" jobs. */
export async function processEscalationCheck(leadId: string, moveToNurture: (leadId: string) => Promise<unknown>) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId }, include: { touches: true } });
  if (!lead || !isConsentActive(lead)) return;

  const responded = lead.touches.some((t) => t.responded);
  if (responded) return;

  await appendAuditLog({
    actor: "system:closer-escalation",
    action: "closer_escalated_to_nurture",
    target: leadId,
    detail: { touchCount: lead.touches.length },
  });

  await moveToNurture(leadId);
}

function schedulingLinkFor(leadId: string): string {
  // Placeholder — no real scheduling provider (Calendly/etc.) wired up yet.
  return `https://schedule.example.com/apex?lead=${leadId}`;
}

async function resolveVertical(jobId: string): Promise<TemplateKey> {
  const job = await prisma.dispatchJob.findUniqueOrThrow({ where: { id: jobId } });
  const task = job.task as { vertical?: TemplateKey };
  if (task.vertical) return task.vertical;
  const brandKit = await prisma.brandKit.findUniqueOrThrow({ where: { jobId } });
  const { selectTemplate } = await import("@apex/renderer/src/selectTemplate.js");
  return selectTemplate(
    {
      name: brandKit.name,
      palette: brandKit.palette,
      fonts: brandKit.fonts,
      services: brandKit.services,
      reviews: brandKit.reviews as Record<string, unknown>[],
    },
    undefined,
  );
}

import { db } from '@/db';
import { leads, deals, mailMessages } from '@/db/schema';
import { and, eq, lt } from 'drizzle-orm';
import { encryptionConfigured } from '@/lib/crypto';
import { buildEncryptedFields, newThreadId, mailboxAddress } from '@/lib/mailbox';
import { deliverEmail } from '@/lib/mailer';
import { generateFollowupEmail } from '@/lib/ai';
import { formatMoney } from '@/lib/crm';

/**
 * CRM follow-up automation (the birthday-mailer pattern, applied to sales).
 *
 * 1. New leads that have sat un-worked past a grace window get an automatic
 *    AI-written first touch, then flip to "contacted" so they're never emailed
 *    twice.
 * 2. Open deals that haven't moved in a while are rolled into a digest sent to
 *    the owner mailbox so nothing goes stale.
 *
 * Runs on the daily cron; also exposed for manual/test runs.
 */

function minAgeMinutes(): number {
  const v = parseInt(process.env.FOLLOWUP_MIN_AGE_MINUTES || '60', 10);
  return Number.isFinite(v) ? v : 60;
}
function staleDealDays(): number {
  const v = parseInt(process.env.STALE_DEAL_DAYS || '7', 10);
  return Number.isFinite(v) ? v : 7;
}

function templateFollowup(name: string, message?: string | null): { subject: string; body: string } {
  const first = (name || '').split(' ')[0] || 'there';
  return {
    subject: 'Following up from Evolve',
    body:
      `Hi ${first},\n\n` +
      `Thanks for reaching out to Evolve${message ? ` about "${message}"` : ''}. ` +
      `We'd love to show you what our AI can do for your business. ` +
      `Reply here or grab a quick call and we'll take it from there.\n\n— The Evolve team`,
  };
}

async function sendFromMailbox(to: string, subject: string, body: string, category: string) {
  const owner = mailboxAddress();
  if (encryptionConfigured()) {
    const enc = buildEncryptedFields(subject, body);
    await db.insert(mailMessages).values({
      threadId: newThreadId(),
      direction: to === owner ? 'inbound' : 'outbound',
      fromEmail: to === owner ? 'crm@evolve.ai' : owner,
      toEmails: to,
      ccEmails: null,
      subjectEncrypted: enc.subjectEncrypted,
      bodyEncrypted: enc.bodyEncrypted,
      preview: enc.preview,
      status: to === owner ? 'unread' : 'sent',
      starred: false,
      priority: 'normal',
      category,
      source: 'ai',
      createdAt: new Date().toISOString(),
    });
  }
  await deliverEmail({ from: owner, to: [to], subject, body });
}

export interface FollowupResult {
  leadsFollowedUp: number;
  leadsSkippedNoEmail: number;
  staleDeals: number;
  digestSent: boolean;
}

export async function runLeadFollowups(): Promise<FollowupResult> {
  const now = Date.now();
  const cutoffIso = new Date(now - minAgeMinutes() * 60_000).toISOString();

  // 1. New, un-worked leads past the grace window.
  const newLeads = await db
    .select()
    .from(leads)
    .where(and(eq(leads.status, 'new'), lt(leads.createdAt, cutoffIso)));

  let followedUp = 0;
  let skippedNoEmail = 0;
  for (const lead of newLeads) {
    if (!lead.email) {
      skippedNoEmail++;
      continue;
    }
    try {
      const ai = await generateFollowupEmail({
        name: lead.name,
        company: lead.company,
        source: lead.source,
        message: lead.message,
      });
      const msg = ai || templateFollowup(lead.name, lead.message);
      await sendFromMailbox(lead.email, msg.subject, msg.body, 'crm_followup');
      await db.update(leads).set({ status: 'contacted' }).where(eq(leads.id, lead.id));
      followedUp++;
    } catch (err) {
      console.error('Lead follow-up error for', lead.email, err);
    }
  }

  // 2. Stale open deals digest.
  const staleCutoff = new Date(now - staleDealDays() * 86_400_000).toISOString();
  const stale = await db
    .select()
    .from(deals)
    .where(and(eq(deals.status, 'open'), lt(deals.updatedAt, staleCutoff)));

  let digestSent = false;
  if (stale.length > 0 && encryptionConfigured()) {
    const lines = stale
      .map((d) => `• ${d.title}${d.company ? ` (${d.company})` : ''} — ${formatMoney(d.valueCents)} — last touched ${d.updatedAt.slice(0, 10)}`)
      .join('\n');
    const body =
      `${stale.length} open deal(s) haven't moved in ${staleDealDays()}+ days:\n\n${lines}\n\n` +
      `Give them a nudge in the pipeline.\n\n— Evolve CRM`;
    await sendFromMailbox(mailboxAddress(), `⏳ ${stale.length} stale deal(s) need attention`, body, 'crm_digest');
    digestSent = true;
  }

  return {
    leadsFollowedUp: followedUp,
    leadsSkippedNoEmail: skippedNoEmail,
    staleDeals: stale.length,
    digestSent,
  };
}

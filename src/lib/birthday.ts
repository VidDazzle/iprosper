import { db } from '@/db';
import { birthdaySubscribers, mailMessages } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { encryptionConfigured } from '@/lib/crypto';
import { buildEncryptedFields, newThreadId, mailboxAddress } from '@/lib/mailbox';
import { deliverEmail } from '@/lib/mailer';
import { generateBirthdayMessage } from '@/lib/ai';

/**
 * Birthday-surprise mailer.
 *
 * Finds subscribers whose birthday is "today" (matched by month/day in a
 * configured timezone, so it's year-agnostic and handles the Feb-29 edge), and
 * sends each a one-per-year birthday email. AI writes a fresh sarcastic-but-warm
 * message; a template is used when the AI isn't configured. Runs from the daily
 * cron and can be triggered manually.
 */

function isLeapYear(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

/** The default gift line; override with BIRTHDAY_SURPRISE. */
function surpriseOffer(): string {
  return (
    process.env.BIRTHDAY_SURPRISE ||
    'a free month of Evolve on us — just reply "birthday" and the AI will take it from there'
  );
}

function templateBirthday(name: string, surprise: string): { subject: string; body: string } {
  const first = (name || '').split(' ')[0] || 'you';
  return {
    subject: `Happy Birthday, ${first} 🎉`,
    body:
      `Happy birthday, ${first}! Another trip around the sun, and somehow your inbox ` +
      `is still more secure than most governments. Impressive.\n\n` +
      `Because you trusted us with your big day (and only because you told us — we ` +
      `wouldn't dream of snooping), here's your surprise: ${surprise}.\n\n` +
      `Go enjoy yourself. The AI will hold down the fort.\n\n— The Evolve crew`,
  };
}

/** Send one email straight from the mailbox (bypasses welcome/tagline logic). */
async function sendBirthdayEmail(to: string, subject: string, body: string): Promise<void> {
  const owner = mailboxAddress();
  if (encryptionConfigured()) {
    const enc = buildEncryptedFields(subject, body);
    await db.insert(mailMessages).values({
      threadId: newThreadId(),
      direction: 'outbound',
      fromEmail: owner,
      toEmails: to,
      ccEmails: null,
      subjectEncrypted: enc.subjectEncrypted,
      bodyEncrypted: enc.bodyEncrypted,
      preview: enc.preview,
      status: 'sent',
      starred: false,
      priority: 'normal',
      category: 'birthday',
      source: 'ai',
      createdAt: new Date().toISOString(),
    });
  }
  await deliverEmail({ from: owner, to: [to], subject, body });
}

export interface BirthdayRunResult {
  date: string;
  matched: number;
  sent: number;
  skipped: number;
  errors: number;
}

export async function runBirthdayGreetings(): Promise<BirthdayRunResult> {
  const tz = process.env.BIRTHDAY_TZ || 'America/New_York';
  const now = new Date();
  const local = new Date(now.toLocaleString('en-US', { timeZone: tz }));
  const month = local.getMonth() + 1;
  const day = local.getDate();
  const year = local.getFullYear();

  const all = await db.select().from(birthdaySubscribers);
  const todays = all.filter((r) => {
    if (r.birthMonth === month && r.birthDay === day) return true;
    // Feb-29 birthdays get greeted on Feb-28 in non-leap years.
    if (r.birthMonth === 2 && r.birthDay === 29 && month === 2 && day === 28 && !isLeapYear(year)) {
      return true;
    }
    return false;
  });

  const surprise = surpriseOffer();
  let sent = 0;
  let skipped = 0;
  let errors = 0;

  for (const r of todays) {
    if (r.lastGreetedYear === year) {
      skipped++; // already greeted this year
      continue;
    }
    try {
      const ai = await generateBirthdayMessage(r.name, surprise);
      const msg = ai || templateBirthday(r.name, surprise);
      await sendBirthdayEmail(r.email, msg.subject, msg.body);
      await db
        .update(birthdaySubscribers)
        .set({ lastGreetedYear: year })
        .where(eq(birthdaySubscribers.id, r.id));
      sent++;
    } catch (err) {
      console.error('Birthday send error for', r.email, err);
      errors++;
    }
  }

  return { date: `${month}-${day}`, matched: todays.length, sent, skipped, errors };
}

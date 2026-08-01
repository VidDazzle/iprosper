import { db } from '@/db';
import { calendarEvents, mailMessages } from '@/db/schema';
import { and, eq, gte, lte } from 'drizzle-orm';
import { encryptionConfigured } from '@/lib/crypto';
import { buildEncryptedFields, newThreadId, mailboxAddress } from '@/lib/mailbox';
import { deliverEmail } from '@/lib/mailer';

/**
 * Calendar reminder dispatcher.
 *
 * Emails attendees + organizer a reminder for upcoming events, once per event
 * (guarded by `reminderSent`). Runs on the cron; also exposed for a dedicated
 * (ideally hourly) trigger. The lookahead window is generous so a daily cron
 * still catches next-day meetings — set REMINDER_WINDOW_MINUTES to tune.
 */
function windowMs(): number {
  const m = parseInt(process.env.REMINDER_WINDOW_MINUTES || '1440', 10); // default 24h
  return (Number.isFinite(m) ? m : 1440) * 60_000;
}

function fmt(iso: string, tz: string): string {
  return new Date(iso).toLocaleString('en-US', {
    timeZone: tz,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export interface ReminderResult {
  due: number;
  sent: number;
  emails: number;
}

export async function runEventReminders(): Promise<ReminderResult> {
  const now = new Date();
  const nowIso = now.toISOString();
  const untilIso = new Date(now.getTime() + windowMs()).toISOString();

  const due = await db
    .select()
    .from(calendarEvents)
    .where(
      and(
        eq(calendarEvents.status, 'scheduled'),
        eq(calendarEvents.reminderSent, false),
        gte(calendarEvents.startsAt, nowIso),
        lte(calendarEvents.startsAt, untilIso),
      ),
    );

  const owner = mailboxAddress();
  let sent = 0;
  let emails = 0;

  for (const ev of due) {
    const recipients = new Set<string>();
    if (ev.organizerEmail) recipients.add(ev.organizerEmail);
    (ev.attendees || '').split(',').map((s) => s.trim()).filter(Boolean).forEach((a) => recipients.add(a));

    const subject = `Reminder: ${ev.title} — ${fmt(ev.startsAt, ev.timezone)}`;
    const body =
      `This is a reminder for your upcoming meeting.\n\n` +
      `${ev.title}\n${fmt(ev.startsAt, ev.timezone)} (${ev.timezone})\n` +
      (ev.location ? `Location: ${ev.location}\n` : '') +
      (ev.meetingUrl ? `Join: ${ev.meetingUrl}\n` : '') +
      (ev.description ? `\n${ev.description}\n` : '') +
      `\n— Evolve Calendar`;

    for (const to of recipients) {
      try {
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
            category: 'reminder',
            source: 'ai',
            createdAt: nowIso,
          });
        }
        await deliverEmail({ from: owner, to: [to], subject, body });
        emails++;
      } catch (err) {
        console.error('Reminder email error for', to, err);
      }
    }

    await db
      .update(calendarEvents)
      .set({ reminderSent: true, updatedAt: nowIso })
      .where(eq(calendarEvents.id, ev.id));
    sent++;
  }

  return { due: due.length, sent, emails };
}

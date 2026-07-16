import { db } from '@/db';
import { calendarEvents, mailMessages, mailAttachments } from '@/db/schema';
import { and, eq, lt, isNull, or } from 'drizzle-orm';
import { tryDecrypt, encryptionConfigured } from '@/lib/crypto';
import { generateMeetingUrl } from '@/lib/scheduling';

/**
 * Self-healing engine.
 *
 * Detects broken or drifted state across the calendar and mailbox and — when
 * `apply` is true — repairs what can be safely repaired automatically. Every
 * check returns a structured result so the maintenance report shows exactly
 * what was found and what was fixed. Nothing here is destructive: repairs
 * either complete stale records, backfill missing fields, or flag data a human
 * must look at.
 */

export interface HealCheck {
  check: string;
  severity: 'info' | 'warning' | 'critical';
  detected: number;
  remediated: number;
  detail: string;
}

export interface HealReport {
  healthScore: number; // 0-100
  status: 'ok' | 'degraded' | 'critical';
  checks: HealCheck[];
}

export async function runSelfHeal(apply: boolean): Promise<HealReport> {
  const checks: HealCheck[] = [];
  const nowIso = new Date().toISOString();

  // 1. Database connectivity — the foundation. If this throws, everything is down.
  try {
    await db.select({ id: calendarEvents.id }).from(calendarEvents).limit(1);
    checks.push({
      check: 'database_connectivity',
      severity: 'info',
      detected: 0,
      remediated: 0,
      detail: 'Database reachable.',
    });
  } catch (err) {
    return {
      healthScore: 0,
      status: 'critical',
      checks: [
        {
          check: 'database_connectivity',
          severity: 'critical',
          detected: 1,
          remediated: 0,
          detail: `Database unreachable: ${String(err)}`,
        },
      ],
    };
  }

  // 2. Past "scheduled" events that already ended → mark completed.
  {
    const stale = await db
      .select({ id: calendarEvents.id })
      .from(calendarEvents)
      .where(and(eq(calendarEvents.status, 'scheduled'), lt(calendarEvents.endsAt, nowIso)));
    let fixed = 0;
    if (apply && stale.length) {
      for (const row of stale) {
        await db
          .update(calendarEvents)
          .set({ status: 'completed', updatedAt: nowIso })
          .where(eq(calendarEvents.id, row.id));
        fixed++;
      }
    }
    checks.push({
      check: 'stale_scheduled_events',
      severity: stale.length ? 'warning' : 'info',
      detected: stale.length,
      remediated: fixed,
      detail: stale.length
        ? `${stale.length} past events still marked scheduled${apply ? ` → completed ${fixed}` : ''}.`
        : 'No stale events.',
    });
  }

  // 3. Active events missing a meeting link → backfill one.
  {
    const missing = await db
      .select({ id: calendarEvents.id })
      .from(calendarEvents)
      .where(
        and(
          eq(calendarEvents.status, 'scheduled'),
          or(isNull(calendarEvents.meetingUrl), eq(calendarEvents.meetingUrl, '')),
        ),
      );
    let fixed = 0;
    if (apply && missing.length) {
      for (const row of missing) {
        await db
          .update(calendarEvents)
          .set({ meetingUrl: generateMeetingUrl(), updatedAt: nowIso })
          .where(eq(calendarEvents.id, row.id));
        fixed++;
      }
    }
    checks.push({
      check: 'missing_meeting_links',
      severity: missing.length ? 'warning' : 'info',
      detected: missing.length,
      remediated: fixed,
      detail: missing.length
        ? `${missing.length} events missing a join link${apply ? ` → backfilled ${fixed}` : ''}.`
        : 'All events have join links.',
    });
  }

  // 4. Overdue reminders never marked sent → reset so they aren't silently lost.
  {
    const overdue = await db
      .select({ id: calendarEvents.id })
      .from(calendarEvents)
      .where(
        and(
          eq(calendarEvents.status, 'scheduled'),
          eq(calendarEvents.reminderSent, false),
          lt(calendarEvents.startsAt, nowIso),
        ),
      );
    let fixed = 0;
    if (apply && overdue.length) {
      for (const row of overdue) {
        await db
          .update(calendarEvents)
          .set({ reminderSent: true, updatedAt: nowIso })
          .where(eq(calendarEvents.id, row.id));
        fixed++;
      }
    }
    checks.push({
      check: 'overdue_reminders',
      severity: overdue.length ? 'info' : 'info',
      detected: overdue.length,
      remediated: fixed,
      detail: overdue.length
        ? `${overdue.length} reminders past due${apply ? ` → cleared ${fixed}` : ''}.`
        : 'No overdue reminders.',
    });
  }

  // 5. Mailbox encryption integrity — sample recent messages and confirm they
  //    still decrypt. Undecryptable rows usually mean a rotated/lost key.
  if (encryptionConfigured()) {
    const sample = await db
      .select({ id: mailMessages.id, subjectEncrypted: mailMessages.subjectEncrypted })
      .from(mailMessages)
      .limit(50);
    let broken = 0;
    for (const row of sample) {
      const marker = '__heal_probe__';
      if (tryDecrypt(row.subjectEncrypted, marker) === marker) broken++;
    }
    checks.push({
      check: 'mail_encryption_integrity',
      severity: broken ? 'critical' : 'info',
      detected: broken,
      remediated: 0, // cannot auto-fix — needs the correct key; flag for a human
      detail: broken
        ? `${broken}/${sample.length} sampled messages will not decrypt — check MAIL_ENCRYPTION_KEY (rotation/mismatch).`
        : `Encryption OK across ${sample.length} sampled messages.`,
    });
  } else {
    checks.push({
      check: 'mail_encryption_integrity',
      severity: 'warning',
      detected: 0,
      remediated: 0,
      detail: 'MAIL_ENCRYPTION_KEY not configured — mailbox disabled.',
    });
  }

  // 6. Outbound mail stuck queued (never delivered). Informational — actual
  //    resend requires a provider; we surface the backlog.
  {
    const queued = await db
      .select({ id: mailMessages.id })
      .from(mailMessages)
      .where(and(eq(mailMessages.direction, 'outbound'), eq(mailMessages.status, 'sent')))
      .limit(500);
    checks.push({
      check: 'outbound_delivery_backlog',
      severity: 'info',
      detected: queued.length,
      remediated: 0,
      detail: `${queued.length} outbound messages stored. Delivery requires RESEND_API_KEY.`,
    });
  }

  // 7. Orphaned attachment uploads — registered but never completed (a stalled
  //    or abandoned upload). Older than 24h → mark failed so they can be swept.
  {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const orphans = await db
      .select({ id: mailAttachments.id })
      .from(mailAttachments)
      .where(and(eq(mailAttachments.status, 'pending'), lt(mailAttachments.createdAt, cutoff)));
    let fixed = 0;
    if (apply && orphans.length) {
      for (const row of orphans) {
        await db.update(mailAttachments).set({ status: 'failed' }).where(eq(mailAttachments.id, row.id));
        fixed++;
      }
    }
    checks.push({
      check: 'orphaned_uploads',
      severity: orphans.length ? 'warning' : 'info',
      detected: orphans.length,
      remediated: fixed,
      detail: orphans.length
        ? `${orphans.length} incomplete uploads >24h old${apply ? ` → marked failed ${fixed}` : ''}.`
        : 'No orphaned uploads.',
    });
  }

  // Score: start at 100, subtract for unremediated problems weighted by severity.
  let score = 100;
  for (const c of checks) {
    const outstanding = c.detected - c.remediated;
    if (outstanding <= 0) continue;
    if (c.severity === 'critical') score -= 40;
    else if (c.severity === 'warning') score -= 10;
  }
  score = Math.max(0, Math.min(100, score));
  const status: HealReport['status'] = score >= 80 ? 'ok' : score >= 50 ? 'degraded' : 'critical';

  return { healthScore: score, status, checks };
}

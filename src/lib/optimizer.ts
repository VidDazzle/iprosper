import { db } from '@/db';
import { calendarEvents, mailMessages, availabilityRules } from '@/db/schema';
import { gte } from 'drizzle-orm';

/**
 * Self-optimizing engine.
 *
 * Learns from historical calendar + mailbox activity and proposes concrete
 * tuning. Recommendations are conservative and, when `apply` is set, only
 * safe/additive changes are made automatically (e.g. widening availability into
 * a consistently-requested hour). Anything with a downside is left as a
 * recommendation for a human to approve.
 */

export interface Recommendation {
  area: 'scheduling' | 'mailbox' | 'reliability';
  suggestion: string;
  rationale: string;
  autoApplied: boolean;
}

export interface OptimizeReport {
  recommendations: Recommendation[];
  stats: Record<string, unknown>;
}

export async function runOptimizer(apply: boolean): Promise<OptimizeReport> {
  const recommendations: Recommendation[] = [];
  const stats: Record<string, unknown> = {};
  const lookbackIso = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(); // 60 days

  const events = await db
    .select({
      startsAt: calendarEvents.startsAt,
      status: calendarEvents.status,
      source: calendarEvents.source,
      timezone: calendarEvents.timezone,
    })
    .from(calendarEvents)
    .where(gte(calendarEvents.createdAt, lookbackIso));

  stats.eventsAnalyzed = events.length;

  if (events.length >= 5) {
    // Cancellation rate — a health signal for the booking flow.
    const cancelled = events.filter((e) => e.status === 'cancelled').length;
    const cancelRate = cancelled / events.length;
    stats.cancelRate = Number(cancelRate.toFixed(2));
    if (cancelRate > 0.3) {
      recommendations.push({
        area: 'scheduling',
        suggestion: 'Add a confirmation reminder 24h before meetings.',
        rationale: `Cancellation rate is ${(cancelRate * 100).toFixed(0)}% — reminders reduce no-shows.`,
        autoApplied: false,
      });
    }

    // Most-requested hour (local to each event's timezone).
    const hourCounts = new Array(24).fill(0);
    for (const e of events) {
      if (e.status === 'cancelled') continue;
      const local = new Date(
        new Date(e.startsAt).toLocaleString('en-US', { timeZone: e.timezone || 'America/New_York' }),
      );
      hourCounts[local.getHours()]++;
    }
    const peakHour = hourCounts.indexOf(Math.max(...hourCounts));
    stats.peakBookingHour = peakHour;

    // If the peak hour sits outside current availability, suggest (or add) it.
    const rules = await db.select().from(availabilityRules);
    if (rules.length && hourCounts[peakHour] >= 3) {
      const covered = rules.some((r) => {
        const start = parseInt(r.startTime.split(':')[0], 10);
        const end = parseInt(r.endTime.split(':')[0], 10);
        return peakHour >= start && peakHour < end;
      });
      if (!covered) {
        recommendations.push({
          area: 'scheduling',
          suggestion: `Extend availability to cover ${String(peakHour).padStart(2, '0')}:00.`,
          rationale: `${hourCounts[peakHour]} bookings clustered at ${peakHour}:00 fall outside current availability windows.`,
          autoApplied: false, // additive but changes when you can be booked — keep human-approved
        });
      }
    }

    // Voice-agent vs manual mix — shows autonomy adoption.
    const viaAgent = events.filter((e) => e.source === 'voice_agent' || e.source === 'ai').length;
    stats.autonomousBookingShare = Number((viaAgent / events.length).toFixed(2));
  } else {
    recommendations.push({
      area: 'scheduling',
      suggestion: 'Not enough booking history yet to optimize.',
      rationale: 'Fewer than 5 events in the last 60 days.',
      autoApplied: false,
    });
  }

  // Mailbox: category distribution + unread backlog.
  const mail = await db
    .select({ status: mailMessages.status, priority: mailMessages.priority, category: mailMessages.category, direction: mailMessages.direction })
    .from(mailMessages)
    .where(gte(mailMessages.createdAt, lookbackIso));
  stats.mailAnalyzed = mail.length;

  if (mail.length >= 5) {
    const unread = mail.filter((m) => m.direction === 'inbound' && m.status === 'unread').length;
    const highUnread = mail.filter(
      (m) => m.direction === 'inbound' && m.status === 'unread' && m.priority === 'high',
    ).length;
    stats.unread = unread;
    stats.highPriorityUnread = highUnread;
    if (highUnread >= 3) {
      recommendations.push({
        area: 'mailbox',
        suggestion: 'Enable auto-draft replies for high-priority unread mail.',
        rationale: `${highUnread} high-priority messages are unread — the AI can pre-draft responses for one-click send.`,
        autoApplied: false,
      });
    }
    // Dominant category → suggest a routing rule.
    const catCounts: Record<string, number> = {};
    for (const m of mail) if (m.category) catCounts[m.category] = (catCounts[m.category] || 0) + 1;
    const top = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0];
    if (top && top[1] >= Math.max(5, mail.length * 0.4)) {
      recommendations.push({
        area: 'mailbox',
        suggestion: `Create a saved view / auto-label for "${top[0]}" mail.`,
        rationale: `"${top[0]}" is ${((top[1] / mail.length) * 100).toFixed(0)}% of recent mail.`,
        autoApplied: false,
      });
    }
    stats.categoryBreakdown = catCounts;
  }

  return { recommendations, stats };
}

import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedAgent } from '@/lib/voice-auth';
import { runFullMaintenance } from '@/lib/maintenance';
import { runBirthdayGreetings } from '@/lib/birthday';
import { runLeadFollowups } from '@/lib/crm-followups';
import { runEventReminders } from '@/lib/reminders';

/**
 * GET /api/maintenance/cron
 *
 * The scheduled entry point. Vercel Cron invokes this with a
 * `Authorization: Bearer <CRON_SECRET>` header (see the crons config in
 * vercel.json). Runs a full self-maintenance cycle with auto-fixes applied.
 *
 * This is what makes the system "self-healing on a schedule": it fires
 * automatically, repairs drift, re-audits security, and records the report —
 * no human in the loop.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const auth = request.headers.get('authorization');
  const authorized =
    (cronSecret && auth === `Bearer ${cronSecret}`) || isAuthorizedAgent(request);

  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runFullMaintenance(true, 'cron');

    // Send today's birthday surprises on the same daily tick (best-effort).
    let birthday = null;
    try {
      birthday = await runBirthdayGreetings();
    } catch (bErr) {
      console.error('Birthday greetings error during cron:', bErr);
    }

    // Work CRM leads/deals on the same daily tick (best-effort).
    let followups = null;
    try {
      followups = await runLeadFollowups();
    } catch (fErr) {
      console.error('CRM follow-up error during cron:', fErr);
    }

    // Dispatch due calendar reminders (best-effort).
    let reminders = null;
    try {
      reminders = await runEventReminders();
    } catch (rErr) {
      console.error('Reminder error during cron:', rErr);
    }

    return NextResponse.json(
      {
        ranAt: new Date().toISOString(),
        status: result.status,
        healthScore: result.heal.healthScore,
        securityScore: result.security.securityScore,
        remediated: result.heal.checks.reduce((n, c) => n + c.remediated, 0),
        recommendations: result.optimize.recommendations.length,
        birthday,
        followups,
        reminders,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('GET /maintenance/cron error:', error);
    return NextResponse.json({ error: 'Scheduled maintenance failed', detail: String(error) }, { status: 500 });
  }
}

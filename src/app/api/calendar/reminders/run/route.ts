import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedAgent } from '@/lib/voice-auth';
import { runEventReminders } from '@/lib/reminders';

/**
 * GET /api/calendar/reminders/run
 * Dispatches due event reminders. Auth: cron secret or voice agent. Also runs
 * from the daily maintenance cron; point an hourly cron here for tighter timing.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const auth = request.headers.get('authorization');
  const authorized = (cronSecret && auth === `Bearer ${cronSecret}`) || isAuthorizedAgent(request);
  if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const result = await runEventReminders();
    return NextResponse.json({ ok: true, ...result }, { status: 200 });
  } catch (error) {
    console.error('GET /calendar/reminders/run error:', error);
    return NextResponse.json({ error: 'Reminder run failed', detail: String(error) }, { status: 500 });
  }
}

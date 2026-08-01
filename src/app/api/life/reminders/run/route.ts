import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedAgent } from '@/lib/voice-auth';
import { runLifeReminders } from '@/lib/life-reminders';

/**
 * GET /api/life/reminders/run
 * Dispatches due personal reminders over each person's chosen channel. Auth:
 * cron secret or voice agent. Also runs from the daily maintenance cron; point
 * an hourly cron here for tighter reminder timing.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const auth = request.headers.get('authorization');
  const authorized = (cronSecret && auth === `Bearer ${cronSecret}`) || isAuthorizedAgent(request);
  if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const result = await runLifeReminders();
    return NextResponse.json({ ok: true, ...result }, { status: 200 });
  } catch (error) {
    console.error('GET /life/reminders/run error:', error);
    return NextResponse.json({ error: 'Life reminder run failed', detail: String(error) }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedAgent } from '@/lib/voice-auth';
import { runBirthdayGreetings } from '@/lib/birthday';

/**
 * GET /api/birthday/run
 *
 * Sends today's birthday-surprise emails. Authorized for the scheduled cron
 * (Authorization: Bearer $CRON_SECRET) or the voice agent (VOICE_AGENT_API_KEY).
 * Also invoked automatically by the daily maintenance cron, so a manual call is
 * only needed for testing or an off-schedule run. Safe to call repeatedly —
 * each subscriber is greeted at most once per year.
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
    const result = await runBirthdayGreetings();
    return NextResponse.json({ ok: true, ...result }, { status: 200 });
  } catch (error) {
    console.error('GET /birthday/run error:', error);
    return NextResponse.json({ error: 'Birthday run failed', detail: String(error) }, { status: 500 });
  }
}

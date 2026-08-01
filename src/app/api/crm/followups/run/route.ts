import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedAgent } from '@/lib/voice-auth';
import { runLeadFollowups } from '@/lib/crm-followups';

/**
 * GET /api/crm/followups/run
 *
 * Sends automatic first-touch emails to un-worked new leads and a stale-deal
 * digest to the owner. Authorized for the cron (Bearer CRON_SECRET) or the
 * voice agent. Also fired automatically by the daily maintenance cron; this
 * endpoint is for manual/test runs. Safe to call repeatedly — contacted leads
 * are skipped.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const auth = request.headers.get('authorization');
  const authorized = (cronSecret && auth === `Bearer ${cronSecret}`) || isAuthorizedAgent(request);
  if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const result = await runLeadFollowups();
    return NextResponse.json({ ok: true, ...result }, { status: 200 });
  } catch (error) {
    console.error('GET /crm/followups/run error:', error);
    return NextResponse.json({ error: 'Follow-up run failed', detail: String(error) }, { status: 500 });
  }
}

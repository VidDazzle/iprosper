import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateProfile } from '@/lib/life';
import { busyForConnections, markSynced, listConnections } from '@/lib/calendar-connect';

/**
 * POST /api/orbit/calendar/sync { email? } — pull busy from all linked calendars
 * now (a health check + freshness touch). Returns how many busy blocks were seen.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const me = await getOrCreateProfile(body.email);
    const from = new Date();
    const to = new Date(from.getTime() + 45 * 86400_000);
    const busy = await busyForConnections(me.id, from, to);
    await markSynced(me.id);
    return NextResponse.json({ ok: true, busyBlocks: busy.length, connections: await listConnections(me.id) }, { status: 200 });
  } catch (err) {
    console.error('POST /orbit/calendar/sync error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

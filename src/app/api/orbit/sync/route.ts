import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateProfile } from '@/lib/life';
import { hasEvolveSubscription, setSync } from '@/lib/orbit';

/**
 * GET  /api/orbit/sync?email= -> { subscribed, syncing }.
 * POST /api/orbit/sync { on }  -> enable/disable Orbit ⇄ Evolve sync (requires
 *      an active Evolve subscription to enable).
 */
export async function GET(request: NextRequest) {
  try {
    const me = await getOrCreateProfile(new URL(request.url).searchParams.get('email'));
    return NextResponse.json({ subscribed: await hasEvolveSubscription(), syncing: me.syncEvolve }, { status: 200 });
  } catch (err) {
    console.error('GET /orbit/sync error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const me = await getOrCreateProfile(body.email);
    const r = await setSync(me.id, Boolean(body.on));
    if (!r.ok) return NextResponse.json({ error: 'subscription_required', message: r.message }, { status: 402 });
    return NextResponse.json({ ok: true, syncing: Boolean(body.on) }, { status: 200 });
  } catch (err) {
    console.error('POST /orbit/sync error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

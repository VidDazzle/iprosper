import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateProfile } from '@/lib/life';
import { listConnections, setConnectionOptions, anyProviderConfigured, providerConfigured } from '@/lib/calendar-connect';

/**
 * GET   /api/orbit/calendar/connections?email= -> linked external calendars.
 * PATCH /api/orbit/calendar/connections { id, syncInbound?, syncOutbound? }
 */
export async function GET(request: NextRequest) {
  try {
    const me = await getOrCreateProfile(new URL(request.url).searchParams.get('email'));
    return NextResponse.json({
      connections: await listConnections(me.id),
      providers: {
        google: providerConfigured('google'),
        microsoft: providerConfigured('microsoft'),
        anyConfigured: anyProviderConfigured(),
      },
    }, { status: 200 });
  } catch (err) {
    console.error('GET /orbit/calendar/connections error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const me = await getOrCreateProfile(body.email);
    const updated = await setConnectionOptions(me.id, Number(body.id), { syncInbound: body.syncInbound, syncOutbound: body.syncOutbound });
    if (!updated) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ connection: updated }, { status: 200 });
  } catch (err) {
    console.error('PATCH /orbit/calendar/connections error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

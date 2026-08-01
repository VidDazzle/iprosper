import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateProfile } from '@/lib/life';
import { unmatch } from '@/lib/safety';

/**
 * POST /api/discovery/unmatch { email?, toProfileId }
 * Sever a match (removes taps + pending meetup requests) without blocking.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const me = await getOrCreateProfile(body.email);
    if (!body.toProfileId) return NextResponse.json({ error: 'toProfileId required' }, { status: 400 });
    await unmatch(me.id, Number(body.toProfileId));
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error('POST /discovery/unmatch error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateProfile } from '@/lib/life';
import { sharePhone } from '@/lib/discovery';

/**
 * POST /api/discovery/share-phone { email?, toProfileId }
 * Opt to share YOUR phone number with a match (only allowed once matched). Each
 * person controls their own number independently.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const me = await getOrCreateProfile(body.email);
    if (!body.toProfileId) return NextResponse.json({ error: 'toProfileId required' }, { status: 400 });
    const r = await sharePhone(me, Number(body.toProfileId));
    return NextResponse.json(r, { status: r.ok ? 200 : 400 });
  } catch (err) {
    console.error('POST /discovery/share-phone error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

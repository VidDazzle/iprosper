import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateProfile } from '@/lib/life';
import { nearby } from '@/lib/discovery';

/**
 * GET /api/discovery/nearby?email=
 * People within my radius who share at least one interest. Returns coarse
 * distance + shared interests only — never anyone's exact location. A person's
 * photo is included only if they've tapped me.
 */
export async function GET(request: NextRequest) {
  try {
    const me = await getOrCreateProfile(new URL(request.url).searchParams.get('email'));
    if (me.lastLat == null || me.lastLng == null) {
      return NextResponse.json({ people: [], needsLocation: true }, { status: 200 });
    }
    return NextResponse.json({ people: await nearby(me) }, { status: 200 });
  } catch (err) {
    console.error('GET /discovery/nearby error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

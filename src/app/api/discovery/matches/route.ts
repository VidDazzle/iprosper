import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateProfile } from '@/lib/life';
import { matches } from '@/lib/discovery';

/** GET /api/discovery/matches?email= -> mutual matches (both tapped). */
export async function GET(request: NextRequest) {
  try {
    const me = await getOrCreateProfile(new URL(request.url).searchParams.get('email'));
    return NextResponse.json({ matches: await matches(me) }, { status: 200 });
  } catch (err) {
    console.error('GET /discovery/matches error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateProfile } from '@/lib/life';
import { isEligibleForDiscovery } from '@/lib/safety';
import { tap } from '@/lib/discovery';

/**
 * POST /api/discovery/tap { email?, toProfileId, message? }
 * Express interest in someone — which reveals YOUR photo to them (you must
 * reveal to see). If they've already tapped you, it's a match and both are
 * notified. Requires identity verification + a discovery photo.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const me = await getOrCreateProfile(body.email);
    if (!(await isEligibleForDiscovery(me.id))) {
      return NextResponse.json({ error: 'not_eligible', message: 'Complete identity verification (18+) and the background check before tapping.' }, { status: 403 });
    }
    if (!me.discoveryPhotoUrl) {
      return NextResponse.json({ error: 'photo_required', message: 'Add a discovery photo first — tapping reveals it to them.' }, { status: 400 });
    }
    if (!body.toProfileId) return NextResponse.json({ error: 'toProfileId required' }, { status: 400 });
    const result = await tap(me, Number(body.toProfileId), body.message);
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (err) {
    console.error('POST /discovery/tap error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

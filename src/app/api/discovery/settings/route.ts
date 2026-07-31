import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { lifeProfiles } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getOrCreateProfile } from '@/lib/life';
import { isVerified } from '@/lib/together';

/**
 * GET /api/discovery/settings?email= -> my discovery settings + verified state.
 * PUT /api/discovery/settings        -> { discoverable, discoveryRadiusMiles,
 *      discoveryPhotoUrl, displayName }. Turning discoverable ON requires
 *      identity verification (anti-catfishing) and a photo.
 */
export async function GET(request: NextRequest) {
  try {
    const me = await getOrCreateProfile(new URL(request.url).searchParams.get('email'));
    return NextResponse.json({
      discoverable: me.discoverable,
      discoveryRadiusMiles: me.discoveryRadiusMiles,
      discoveryPhotoUrl: me.discoveryPhotoUrl,
      displayName: me.displayName,
      hasLocation: me.lastLat != null && me.lastLng != null,
      verified: await isVerified(me.id),
    }, { status: 200 });
  } catch (err) {
    console.error('GET /discovery/settings error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const me = await getOrCreateProfile(body.email);
    const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() };

    if (typeof body.discoverable === 'boolean') {
      if (body.discoverable) {
        if (!(await isVerified(me.id))) {
          return NextResponse.json({ error: 'identity_required', message: 'Verify your identity before making your profile discoverable.' }, { status: 403 });
        }
        if (!(body.discoveryPhotoUrl || me.discoveryPhotoUrl)) {
          return NextResponse.json({ error: 'photo_required', message: 'Add a discovery photo before going discoverable.' }, { status: 400 });
        }
        if (me.lastLat == null && body.lat == null) {
          return NextResponse.json({ error: 'location_required', message: 'Share your location before going discoverable.' }, { status: 400 });
        }
      }
      patch.discoverable = body.discoverable;
    }
    if (body.discoveryRadiusMiles !== undefined) patch.discoveryRadiusMiles = Math.max(1, Math.min(50, Number(body.discoveryRadiusMiles)));
    if (body.discoveryPhotoUrl !== undefined) patch.discoveryPhotoUrl = body.discoveryPhotoUrl || null;
    if (body.displayName !== undefined) patch.displayName = body.displayName || null;
    if (body.lat !== undefined && body.lng !== undefined) { patch.lastLat = Number(body.lat); patch.lastLng = Number(body.lng); patch.lastLocationAt = new Date().toISOString(); }

    const updated = await db.update(lifeProfiles).set(patch).where(eq(lifeProfiles.id, me.id)).returning();
    const p = updated[0];
    return NextResponse.json({ discoverable: p.discoverable, discoveryRadiusMiles: p.discoveryRadiusMiles, discoveryPhotoUrl: p.discoveryPhotoUrl, displayName: p.displayName }, { status: 200 });
  } catch (err) {
    console.error('PUT /discovery/settings error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

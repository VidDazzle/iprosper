import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { lifeProfiles } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getOrCreateProfile } from '@/lib/life';

/**
 * PUT /api/together/location { email?, lat, lng, shareLocation? }
 * Update my current location (the partner sees it only if sharing is on). This
 * is a manual/opt-in position update the app can call from the device.
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const me = await getOrCreateProfile(body.email);
    const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (body.lat !== undefined && body.lng !== undefined) {
      patch.lastLat = Number(body.lat);
      patch.lastLng = Number(body.lng);
      patch.lastLocationAt = new Date().toISOString();
    }
    if (typeof body.shareLocation === 'boolean') patch.shareLocation = body.shareLocation;
    if (body.city !== undefined) patch.city = body.city || null;
    const updated = await db.update(lifeProfiles).set(patch).where(eq(lifeProfiles.id, me.id)).returning();
    const p = updated[0];
    return NextResponse.json({ ok: true, location: { lat: p.lastLat, lng: p.lastLng, at: p.lastLocationAt }, shareLocation: p.shareLocation }, { status: 200 });
  } catch (err) {
    console.error('PUT /together/location error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

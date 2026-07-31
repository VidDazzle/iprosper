import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { lifeProfiles } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getOrCreateProfile, preferencesGrouped } from '@/lib/life';

/**
 * GET /api/life/profile?email= -> the person's profile + grouped preferences.
 * PUT /api/life/profile        -> update profile fields (city, home location,
 *                                 timezone, reminder channel, phone, quiet
 *                                 hours) and/or mark onboarding complete.
 */
export async function GET(request: NextRequest) {
  try {
    const email = new URL(request.url).searchParams.get('email');
    const profile = await getOrCreateProfile(email);
    const preferences = await preferencesGrouped(profile.id);
    return NextResponse.json({ profile, preferences }, { status: 200 });
  } catch (err) {
    console.error('GET /life/profile error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const profile = await getOrCreateProfile(body.email);
    const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    for (const f of ['name', 'city', 'phone', 'timezone', 'quietHoursStart', 'quietHoursEnd', 'pushEndpoint'] as const) {
      if (body[f] !== undefined) patch[f] = body[f] || null;
    }
    if (body.homeLat !== undefined) patch.homeLat = body.homeLat === null ? null : Number(body.homeLat);
    if (body.homeLng !== undefined) patch.homeLng = body.homeLng === null ? null : Number(body.homeLng);
    if (['email', 'sms', 'push', 'voice'].includes(body.reminderChannel)) patch.reminderChannel = body.reminderChannel;
    if (typeof body.onboarded === 'boolean') patch.onboarded = body.onboarded;

    const updated = await db.update(lifeProfiles).set(patch).where(eq(lifeProfiles.id, profile.id)).returning();
    return NextResponse.json({ profile: updated[0] }, { status: 200 });
  } catch (err) {
    console.error('PUT /life/profile error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

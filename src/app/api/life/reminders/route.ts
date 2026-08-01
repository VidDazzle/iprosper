import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { lifeReminders } from '@/db/schema';
import { and, eq, asc } from 'drizzle-orm';
import { getOrCreateProfile } from '@/lib/life';

/**
 * GET   /api/life/reminders?email=      -> upcoming personal reminders.
 * POST  /api/life/reminders             -> create one { title, detail?, category?,
 *          whenAt, channel?, recurrence? }. channel 'inherit' uses the profile's.
 * PATCH /api/life/reminders             -> update status { id, status } (done/cancelled)
 *          or reschedule { id, whenAt }.
 */
export async function GET(request: NextRequest) {
  try {
    const email = new URL(request.url).searchParams.get('email');
    const profile = await getOrCreateProfile(email);
    const rows = await db
      .select()
      .from(lifeReminders)
      .where(eq(lifeReminders.profileId, profile.id))
      .orderBy(asc(lifeReminders.whenAt));
    return NextResponse.json({ reminders: rows }, { status: 200 });
  } catch (err) {
    console.error('GET /life/reminders error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.title || !body.whenAt) {
      return NextResponse.json({ error: 'title and whenAt are required' }, { status: 400 });
    }
    const profile = await getOrCreateProfile(body.email);
    const channel = ['inherit', 'email', 'sms', 'push', 'voice'].includes(body.channel) ? body.channel : 'inherit';
    const recurrence = ['none', 'daily', 'weekly', 'monthly'].includes(body.recurrence) ? body.recurrence : 'none';
    const inserted = await db
      .insert(lifeReminders)
      .values({
        profileId: profile.id,
        title: String(body.title),
        detail: body.detail ? String(body.detail) : null,
        category: body.category || 'personal',
        whenAt: new Date(body.whenAt).toISOString(),
        channel,
        recurrence,
        status: 'scheduled',
        createdAt: new Date().toISOString(),
      })
      .returning();
    return NextResponse.json({ reminder: inserted[0] }, { status: 201 });
  } catch (err) {
    console.error('POST /life/reminders error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const profile = await getOrCreateProfile(body.email);
    const patch: Record<string, unknown> = {};
    if (['scheduled', 'sent', 'done', 'cancelled'].includes(body.status)) patch.status = body.status;
    if (body.whenAt) patch.whenAt = new Date(body.whenAt).toISOString();
    if (Object.keys(patch).length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    const updated = await db
      .update(lifeReminders)
      .set(patch)
      .where(and(eq(lifeReminders.id, Number(body.id)), eq(lifeReminders.profileId, profile.id)))
      .returning();
    return NextResponse.json({ reminder: updated[0] || null }, { status: 200 });
  } catch (err) {
    console.error('PATCH /life/reminders error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { lifeProfiles } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getOrCreateProfile } from '@/lib/life';
import { activeConnectionFor, partnerIdOf, partnerCard, dailySchedule, mutualFreeSlots, isVerified } from '@/lib/together';

/**
 * GET /api/together/overview?email=&day=ISO
 * The shared view: partner card (with location if shared), each person's
 * schedule for the day, mutual free slots for planning a date, and my
 * verification status (gates photo upload).
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const me = await getOrCreateProfile(url.searchParams.get('email'));
    const conn = await activeConnectionFor(me.id);
    if (!conn) return NextResponse.json({ connection: null }, { status: 200 });

    const partnerId = partnerIdOf(conn, me.id);
    if (!partnerId) return NextResponse.json({ connection: conn, partner: null }, { status: 200 });
    const pRows = await db.select().from(lifeProfiles).where(eq(lifeProfiles.id, partnerId)).limit(1);
    const partner = pRows[0];

    const day = url.searchParams.get('day') || new Date().toISOString();
    const [mySchedule, partnerSchedule, mutual, verified] = await Promise.all([
      dailySchedule(me.id, day),
      conn.shareCalendar ? dailySchedule(partnerId, day) : Promise.resolve([]),
      mutualFreeSlots(me.id, partnerId, me.timezone),
      isVerified(me.id),
    ]);

    return NextResponse.json(
      {
        connection: conn,
        me: { id: me.id, name: me.name || me.email, city: me.city, verified },
        partner: partner ? partnerCard(partner, conn) : null,
        mySchedule,
        partnerSchedule,
        calendarShared: conn.shareCalendar,
        mutualSlots: mutual,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error('GET /together/overview error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

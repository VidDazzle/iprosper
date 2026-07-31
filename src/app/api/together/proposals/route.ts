import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { dateProposals, calendarEvents } from '@/db/schema';
import { and, eq, desc } from 'drizzle-orm';
import { getOrCreateProfile } from '@/lib/life';
import { activeConnectionFor, partnerIdOf } from '@/lib/together';

/**
 * GET   /api/together/proposals?email=   -> proposals in my active connection.
 * POST  /api/together/proposals          -> propose a date { activity, location,
 *                                            startsAt, endsAt, note }.
 * PATCH /api/together/proposals          -> respond { id, action: accept | decline
 *                                            | counter (+activity,startsAt,...) }.
 *
 * A proposal is created by one partner (status 'proposed'); the OTHER partner
 * must accept for it to become 'confirmed' — i.e. both have agreed — at which
 * point it's placed on both people's calendars. A counter records the old one
 * as 'countered' and creates a child proposal from the responder, and so on
 * until someone accepts.
 */
export async function GET(request: NextRequest) {
  try {
    const me = await getOrCreateProfile(new URL(request.url).searchParams.get('email'));
    const conn = await activeConnectionFor(me.id);
    if (!conn) return NextResponse.json({ proposals: [], meId: me.id }, { status: 200 });
    const rows = await db
      .select()
      .from(dateProposals)
      .where(eq(dateProposals.connectionId, conn.id))
      .orderBy(desc(dateProposals.createdAt));
    return NextResponse.json({ proposals: rows, meId: me.id }, { status: 200 });
  } catch (err) {
    console.error('GET /together/proposals error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const me = await getOrCreateProfile(body.email);
    const conn = await activeConnectionFor(me.id);
    if (!conn) return NextResponse.json({ error: 'No active connection' }, { status: 400 });
    if (!body.activity || !body.startsAt || !body.endsAt) {
      return NextResponse.json({ error: 'activity, startsAt, endsAt required' }, { status: 400 });
    }
    const now = new Date().toISOString();
    const inserted = await db
      .insert(dateProposals)
      .values({
        connectionId: conn.id,
        fromProfileId: me.id,
        parentId: body.parentId ?? null,
        activity: String(body.activity),
        location: body.location ? String(body.location) : null,
        startsAt: new Date(body.startsAt).toISOString(),
        endsAt: new Date(body.endsAt).toISOString(),
        note: body.note ? String(body.note) : null,
        status: 'proposed',
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return NextResponse.json({ proposal: inserted[0] }, { status: 201 });
  } catch (err) {
    console.error('POST /together/proposals error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const me = await getOrCreateProfile(body.email);
    const conn = await activeConnectionFor(me.id);
    if (!conn) return NextResponse.json({ error: 'No active connection' }, { status: 400 });

    const rows = await db.select().from(dateProposals).where(eq(dateProposals.id, Number(body.id))).limit(1);
    const prop = rows[0];
    if (!prop || prop.connectionId !== conn.id) return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });

    // Only the partner who did NOT send it may accept/decline/counter.
    if (prop.fromProfileId === me.id) {
      return NextResponse.json({ error: 'Wait for your partner to respond to your proposal.' }, { status: 403 });
    }
    const now = new Date().toISOString();

    if (body.action === 'accept') {
      await db.update(dateProposals).set({ status: 'confirmed', updatedAt: now }).where(eq(dateProposals.id, prop.id));
      // Place the confirmed date on BOTH calendars.
      const partnerId = partnerIdOf(conn, me.id);
      const base = {
        title: `❤️ ${prop.activity}`,
        description: prop.note,
        location: prop.location,
        startsAt: prop.startsAt,
        endsAt: prop.endsAt,
        status: 'confirmed' as const,
        source: 'together',
        createdAt: now,
        updatedAt: now,
      };
      await db.insert(calendarEvents).values([
        { ...base, ownerProfileId: me.id },
        ...(partnerId ? [{ ...base, ownerProfileId: partnerId }] : []),
      ]);
      return NextResponse.json({ status: 'confirmed' }, { status: 200 });
    }

    if (body.action === 'decline') {
      await db.update(dateProposals).set({ status: 'declined', updatedAt: now }).where(eq(dateProposals.id, prop.id));
      return NextResponse.json({ status: 'declined' }, { status: 200 });
    }

    if (body.action === 'counter') {
      if (!body.startsAt || !body.endsAt || !body.activity) {
        return NextResponse.json({ error: 'counter requires activity, startsAt, endsAt' }, { status: 400 });
      }
      await db.update(dateProposals).set({ status: 'countered', updatedAt: now }).where(eq(dateProposals.id, prop.id));
      const child = await db
        .insert(dateProposals)
        .values({
          connectionId: conn.id,
          fromProfileId: me.id,
          parentId: prop.id,
          activity: String(body.activity),
          location: body.location ? String(body.location) : prop.location,
          startsAt: new Date(body.startsAt).toISOString(),
          endsAt: new Date(body.endsAt).toISOString(),
          note: body.note ? String(body.note) : null,
          status: 'proposed',
          createdAt: now,
          updatedAt: now,
        })
        .returning();
      return NextResponse.json({ status: 'countered', proposal: child[0] }, { status: 200 });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    console.error('PATCH /together/proposals error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

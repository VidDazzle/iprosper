import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { connections, lifeProfiles } from '@/db/schema';
import { and, eq, or } from 'drizzle-orm';
import { getOrCreateProfile } from '@/lib/life';

/**
 * GET   /api/together/connection?email=  -> my active connection + partner,
 *                                           plus any pending invites to me.
 * POST  /api/together/connection         -> invite a partner by email.
 * PATCH /api/together/connection         -> accept | decline | pause | resume,
 *                                           or toggle shareLocation/shareCalendar.
 */
export async function GET(request: NextRequest) {
  try {
    const email = new URL(request.url).searchParams.get('email');
    const me = await getOrCreateProfile(email);

    const mine = await db
      .select()
      .from(connections)
      .where(or(eq(connections.inviterProfileId, me.id), eq(connections.inviteeProfileId, me.id), eq(connections.inviteeEmail, me.email)));

    const active = mine.find((c) => c.status === 'active') || null;
    const invitesToMe = mine.filter((c) => c.status === 'pending' && c.inviteeEmail === me.email && c.inviterProfileId !== me.id);
    const outgoing = mine.filter((c) => c.status === 'pending' && c.inviterProfileId === me.id);

    let partner = null;
    if (active) {
      const partnerId = active.inviterProfileId === me.id ? active.inviteeProfileId : active.inviterProfileId;
      if (partnerId) {
        const p = await db.select().from(lifeProfiles).where(eq(lifeProfiles.id, partnerId)).limit(1);
        partner = p[0] ? { id: p[0].id, name: p[0].name || p[0].email, email: p[0].email, city: p[0].city } : null;
      }
    }
    return NextResponse.json({ me: { id: me.id, email: me.email }, connection: active, partner, invitesToMe, outgoing }, { status: 200 });
  } catch (err) {
    console.error('GET /together/connection error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const inviteeEmail = (body.inviteeEmail || '').toString().trim().toLowerCase();
    if (!inviteeEmail) return NextResponse.json({ error: 'inviteeEmail required' }, { status: 400 });
    const me = await getOrCreateProfile(body.email);
    if (inviteeEmail === me.email.toLowerCase()) {
      return NextResponse.json({ error: "You can't connect with yourself." }, { status: 400 });
    }
    // If the invitee already has a profile, link it now.
    const existing = await db.select().from(lifeProfiles).where(eq(lifeProfiles.email, inviteeEmail)).limit(1);
    const now = new Date().toISOString();
    const inserted = await db
      .insert(connections)
      .values({
        inviterProfileId: me.id,
        inviteeEmail,
        inviteeProfileId: existing[0]?.id ?? null,
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return NextResponse.json({ connection: inserted[0] }, { status: 201 });
  } catch (err) {
    console.error('POST /together/connection error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const me = await getOrCreateProfile(body.email);
    const rows = await db.select().from(connections).where(eq(connections.id, Number(body.id))).limit(1);
    const conn = rows[0];
    if (!conn) return NextResponse.json({ error: 'Connection not found' }, { status: 404 });

    const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (body.action === 'accept') {
      // Only the invitee can accept; bind their profile id.
      if (conn.inviteeEmail !== me.email) return NextResponse.json({ error: 'Only the invited person can accept.' }, { status: 403 });
      patch.status = 'active';
      patch.inviteeProfileId = me.id;
    } else if (body.action === 'decline') {
      patch.status = 'declined';
    } else if (body.action === 'pause') {
      patch.status = 'paused';
    } else if (body.action === 'resume') {
      patch.status = 'active';
    }
    if (typeof body.shareLocation === 'boolean') patch.shareLocation = body.shareLocation;
    if (typeof body.shareCalendar === 'boolean') patch.shareCalendar = body.shareCalendar;

    const updated = await db.update(connections).set(patch).where(eq(connections.id, conn.id)).returning();
    return NextResponse.json({ connection: updated[0] }, { status: 200 });
  } catch (err) {
    console.error('PATCH /together/connection error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

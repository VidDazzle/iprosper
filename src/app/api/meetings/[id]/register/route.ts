import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { leads } from '@/db/schema';
import { findMeeting } from '@/lib/meetings';

/**
 * POST /api/meetings/[id]/register  (public, CORS-open)
 * Body: { name, email?, company?, message? }
 *
 * Webinar registration. Captures the registrant as a CRM lead (source
 * "webinar") so marketing/sales can follow up, and returns the join details.
 * This is what turns a webinar into a lead-gen + selling channel.
 */
type Params = { params: Promise<{ id: string }> };

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return NextResponse.json({}, { status: 200, headers: cors });
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const meeting = await findMeeting((await params).id);
    if (!meeting) return NextResponse.json({ error: 'Meeting not found' }, { status: 404, headers: cors });

    const body = await request.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400, headers: cors });

    await db.insert(leads).values({
      name,
      email: body.email ? String(body.email).trim().toLowerCase() : null,
      phone: body.phone ? String(body.phone).trim() : null,
      company: body.company || null,
      source: 'webinar',
      message: `Registered for "${meeting.title}" (${meeting.roomCode})${body.message ? `: ${body.message}` : ''}`,
      status: 'new',
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json(
      { registered: true, roomCode: meeting.roomCode, joinUrl: `/meetings/${meeting.roomCode}`, title: meeting.title },
      { status: 201, headers: cors },
    );
  } catch (error) {
    console.error('POST /meetings/[id]/register error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: cors });
  }
}

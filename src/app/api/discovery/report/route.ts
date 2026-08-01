import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateProfile } from '@/lib/life';
import { reportUser } from '@/lib/safety';

/**
 * POST /api/discovery/report { email?, toProfileId, reason, detail? }
 * File an abuse report. Reporting also blocks the reported person.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const me = await getOrCreateProfile(body.email);
    if (!body.toProfileId || !body.reason) return NextResponse.json({ error: 'toProfileId and reason required' }, { status: 400 });
    await reportUser(me.id, Number(body.toProfileId), String(body.reason), body.detail);
    return NextResponse.json({ ok: true, message: 'Report submitted. This person has been blocked.' }, { status: 200 });
  } catch (err) {
    console.error('POST /discovery/report error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

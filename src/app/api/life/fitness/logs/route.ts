import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { fitnessLogs } from '@/db/schema';
import { and, eq, desc } from 'drizzle-orm';
import { getOrCreateProfile } from '@/lib/life';
import { addLog } from '@/lib/fitness';

const KINDS = ['workout', 'strength', 'cardio', 'run', 'weigh_in', 'steps', 'custom'];

/**
 * GET    /api/life/fitness/logs?email= -> recent logs.
 * POST   /api/life/fitness/logs        -> log { kind, label?, value?, unit?, note?, loggedAt? }.
 * DELETE /api/life/fitness/logs?id=&email= -> remove a log.
 */
export async function GET(request: NextRequest) {
  try {
    const me = await getOrCreateProfile(new URL(request.url).searchParams.get('email'));
    const rows = await db.select().from(fitnessLogs).where(eq(fitnessLogs.profileId, me.id)).orderBy(desc(fitnessLogs.loggedAt)).limit(50);
    return NextResponse.json({ logs: rows }, { status: 200 });
  } catch (err) {
    console.error('GET /life/fitness/logs error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!KINDS.includes(body.kind)) return NextResponse.json({ error: 'valid kind required' }, { status: 400 });
    const me = await getOrCreateProfile(body.email);
    const log = await addLog(me.id, {
      kind: body.kind, label: body.label, value: body.value != null ? Number(body.value) : undefined,
      unit: body.unit, note: body.note, loggedAt: body.loggedAt,
    });
    return NextResponse.json({ log }, { status: 201 });
  } catch (err) {
    console.error('POST /life/fitness/logs error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const me = await getOrCreateProfile(url.searchParams.get('email'));
    const id = Number(url.searchParams.get('id'));
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    await db.delete(fitnessLogs).where(and(eq(fitnessLogs.id, id), eq(fitnessLogs.profileId, me.id)));
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error('DELETE /life/fitness/logs error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

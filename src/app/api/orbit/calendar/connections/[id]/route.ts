import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateProfile } from '@/lib/life';
import { disconnect } from '@/lib/calendar-connect';

/** DELETE /api/orbit/calendar/connections/:id?email= -> unlink a calendar. */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const me = await getOrCreateProfile(new URL(request.url).searchParams.get('email'));
    await disconnect(me.id, Number(id));
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error('DELETE /orbit/calendar/connections/[id] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

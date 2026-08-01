import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateProfile } from '@/lib/life';
import { listNotifications, unreadCount, markRead } from '@/lib/notifications';

/**
 * GET   /api/notifications?email=        -> recent notifications + unread count.
 * PATCH /api/notifications { id? }       -> mark one (id) or all read.
 */
export async function GET(request: NextRequest) {
  try {
    const me = await getOrCreateProfile(new URL(request.url).searchParams.get('email'));
    const [items, unread] = await Promise.all([listNotifications(me.id), unreadCount(me.id)]);
    return NextResponse.json({ notifications: items, unread }, { status: 200 });
  } catch (err) {
    console.error('GET /notifications error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const me = await getOrCreateProfile(body.email);
    await markRead(me.id, body.id ? Number(body.id) : undefined);
    return NextResponse.json({ ok: true, unread: await unreadCount(me.id) }, { status: 200 });
  } catch (err) {
    console.error('PATCH /notifications error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

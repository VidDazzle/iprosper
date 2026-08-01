import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateProfile } from '@/lib/life';
import { threads } from '@/lib/chat';

/** GET /api/chat/threads?email= -> people I can message + last message + unread. */
export async function GET(request: NextRequest) {
  try {
    const me = await getOrCreateProfile(new URL(request.url).searchParams.get('email'));
    return NextResponse.json({ threads: await threads(me), meId: me.id }, { status: 200 });
  } catch (err) {
    console.error('GET /chat/threads error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

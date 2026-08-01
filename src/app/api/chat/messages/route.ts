import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateProfile } from '@/lib/life';
import { conversation, sendMessage } from '@/lib/chat';

/**
 * GET  /api/chat/messages?email=&withProfileId= -> the conversation (marks read).
 * POST /api/chat/messages { email?, toProfileId, body }  -> send a message.
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const me = await getOrCreateProfile(url.searchParams.get('email'));
    const withId = Number(url.searchParams.get('withProfileId'));
    if (!withId) return NextResponse.json({ error: 'withProfileId required' }, { status: 400 });
    return NextResponse.json({ messages: await conversation(me, withId) }, { status: 200 });
  } catch (err) {
    console.error('GET /chat/messages error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const me = await getOrCreateProfile(body.email);
    if (!body.toProfileId || !body.body) return NextResponse.json({ error: 'toProfileId and body required' }, { status: 400 });
    const r = await sendMessage(me, Number(body.toProfileId), String(body.body));
    return NextResponse.json(r, { status: r.ok ? 201 : 403 });
  } catch (err) {
    console.error('POST /chat/messages error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

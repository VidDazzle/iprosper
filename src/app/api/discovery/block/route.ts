import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateProfile } from '@/lib/life';
import { blockUser, unblockUser } from '@/lib/safety';

/**
 * POST /api/discovery/block { email?, toProfileId, action?: 'block' | 'unblock' }
 * Blocking hides the pair from each other both ways and unmatches them.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const me = await getOrCreateProfile(body.email);
    if (!body.toProfileId) return NextResponse.json({ error: 'toProfileId required' }, { status: 400 });
    if (body.action === 'unblock') await unblockUser(me.id, Number(body.toProfileId));
    else await blockUser(me.id, Number(body.toProfileId));
    return NextResponse.json({ ok: true, action: body.action === 'unblock' ? 'unblocked' : 'blocked' }, { status: 200 });
  } catch (err) {
    console.error('POST /discovery/block error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

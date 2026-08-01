import { NextResponse, type NextRequest } from 'next/server';
import { isModerator, suspendProfile } from '@/lib/moderation';

export const dynamic = 'force-dynamic';

// PATCH /api/moderation/user { profileId, action: 'suspend' | 'unsuspend' }
export async function PATCH(request: NextRequest) {
  if (!isModerator(request)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const profileId = Number(body.profileId);
  const action = body.action;
  if (!profileId || !['suspend', 'unsuspend'].includes(action)) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }
  await suspendProfile(profileId, action === 'suspend');
  return NextResponse.json({ ok: true });
}

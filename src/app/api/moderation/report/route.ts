import { NextResponse, type NextRequest } from 'next/server';
import { isModerator, actionReport } from '@/lib/moderation';

export const dynamic = 'force-dynamic';

// PATCH /api/moderation/report { id, action: 'suspend' | 'dismiss' | 'reviewed' }
export async function PATCH(request: NextRequest) {
  if (!isModerator(request)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const id = Number(body.id);
  const action = body.action;
  if (!id || !['suspend', 'dismiss', 'reviewed'].includes(action)) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }
  await actionReport(id, action);
  return NextResponse.json({ ok: true });
}

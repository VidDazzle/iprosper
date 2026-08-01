import { NextResponse, type NextRequest } from 'next/server';
import { isModerator, getModerationSummary } from '@/lib/moderation';

export const dynamic = 'force-dynamic';

// GET /api/moderation/summary — open reports, screening flags, suspended users.
export async function GET(request: NextRequest) {
  if (!isModerator(request)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  return NextResponse.json(await getModerationSummary());
}

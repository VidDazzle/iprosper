import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateProfile } from '@/lib/life';
import { summary } from '@/lib/fitness';

/** GET /api/life/fitness/summary?email= -> streak, weekly count, goals, PRs, recent logs. */
export async function GET(request: NextRequest) {
  try {
    const me = await getOrCreateProfile(new URL(request.url).searchParams.get('email'));
    return NextResponse.json(await summary(me.id, me.timezone), { status: 200 });
  } catch (err) {
    console.error('GET /life/fitness/summary error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

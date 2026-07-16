import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { voiceAgentLog } from '@/db/schema';
import { desc } from 'drizzle-orm';

/** GET /api/voice-agent/log?limit=  -> recent autonomous-action audit trail. */
export async function GET(request: NextRequest) {
  try {
    const limit = Math.min(parseInt(new URL(request.url).searchParams.get('limit') || '50'), 200);
    const rows = await db.select().from(voiceAgentLog).orderBy(desc(voiceAgentLog.createdAt)).limit(limit);
    return NextResponse.json({ log: rows }, { status: 200 });
  } catch (error) {
    console.error('GET /voice-agent/log error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

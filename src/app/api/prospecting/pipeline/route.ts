import { NextRequest, NextResponse } from 'next/server';
import { PLATFORMS, type Platform } from '@/lib/prospecting/types';
import { ingestPlatform, classifyNewMentions, draftForQueuedProspects, runCycle } from '@/lib/prospecting/pipeline';

// Trigger pipeline stages. This is designed to be called by a scheduler
// (cron / Routine) as well as manually from the dashboard.
//
// body: { stage: 'ingest' | 'classify' | 'draft' | 'cycle', platform?, minScore? }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const stage = body.stage ?? 'cycle';
    const platform = body.platform as Platform | undefined;

    switch (stage) {
      case 'ingest': {
        if (!platform || !PLATFORMS.includes(platform)) {
          return NextResponse.json({ error: 'valid platform required for ingest', code: 'INVALID_PLATFORM' }, { status: 400 });
        }
        return NextResponse.json(await ingestPlatform(platform), { status: 200 });
      }
      case 'classify':
        return NextResponse.json(await classifyNewMentions(body.batch ?? 50), { status: 200 });
      case 'draft':
        return NextResponse.json(await draftForQueuedProspects(body.minScore ?? 50, body.max ?? 25), { status: 200 });
      case 'cycle': {
        if (!platform || !PLATFORMS.includes(platform)) {
          return NextResponse.json({ error: 'valid platform required for cycle', code: 'INVALID_PLATFORM' }, { status: 400 });
        }
        return NextResponse.json(await runCycle(platform), { status: 200 });
      }
      default:
        return NextResponse.json({ error: 'unknown stage', code: 'INVALID_STAGE' }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error: ' + error, code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

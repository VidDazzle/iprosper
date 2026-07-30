import { NextRequest, NextResponse } from 'next/server';
import { implementedPlatforms, getConnector, credsFromEnv } from '@/lib/prospecting/connectors';
import { runCycle } from '@/lib/prospecting/pipeline';
import { runOptimizer } from '@/lib/prospecting/optimizer';
import { db } from '@/db';
import { auditLog } from '@/db/schema';

// Scheduled entry point for the cadence. Invoked by Vercel Cron (see
// vercel.json). Two jobs:
//   ?job=listen   → ingest + classify + draft for every configured connector
//   ?job=optimize → run the autonomous performance optimizer
//   ?job=all      → both (default)
//
// Auth: when CRON_SECRET is set, the caller must present
// `Authorization: Bearer <CRON_SECRET>` (Vercel Cron sends this automatically).
// Drafting never sends — the review queue still gates all outreach — so the
// worst case of an unauthorized trigger is wasted read quota, but we lock it
// down anyway.

const now = () => new Date().toISOString();

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // no secret configured → allow (dev); set one in prod
  const header = request.headers.get('authorization') ?? '';
  return header === `Bearer ${secret}`;
}

async function handle(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const job = searchParams.get('job') ?? 'all';

  const result: {
    job: string;
    listen?: unknown[];
    optimize?: { evaluated: number; paused: number; reactivated: number };
    skipped?: string[];
  } = { job };

  try {
    if (job === 'listen' || job === 'all') {
      const listen: unknown[] = [];
      const skipped: string[] = [];
      for (const platform of implementedPlatforms()) {
        const connector = getConnector(platform);
        if (!connector || !connector.isConfigured(credsFromEnv(platform))) {
          skipped.push(`${platform}: not configured`);
          continue;
        }
        listen.push(await runCycle(platform));
      }
      result.listen = listen;
      result.skipped = skipped;
    }

    if (job === 'optimize' || job === 'all') {
      const opt = await runOptimizer();
      result.optimize = { evaluated: opt.evaluated, paused: opt.paused, reactivated: opt.reactivated };
    }

    await db.insert(auditLog).values({
      actor: 'cron',
      action: `cron_${job}`,
      entityType: 'pipeline',
      detail: JSON.stringify({ listen: result.listen?.length ?? 0, optimize: result.optimize ?? null }),
      createdAt: now(),
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error: ' + error, code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

// Vercel Cron issues GET requests; POST is supported for manual/API triggers.
export async function GET(request: NextRequest) {
  return handle(request);
}
export async function POST(request: NextRequest) {
  return handle(request);
}

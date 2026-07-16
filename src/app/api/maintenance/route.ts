import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { maintenanceRuns } from '@/db/schema';
import { desc } from 'drizzle-orm';
import { isAuthorizedAgent } from '@/lib/voice-auth';
import { runFullMaintenance } from '@/lib/maintenance';

/**
 * Self-maintenance endpoint — the beating heart of the self-healing /
 * self-optimizing system.
 *
 * POST /api/maintenance?apply=true   runs heal + security audit + optimize,
 *   applies safe auto-fixes when apply=true, persists a scored report, and
 *   returns a summary.
 * GET  /api/maintenance              returns recent maintenance reports (for the
 *   dashboard) plus the latest scores.
 *
 * Auth: a Vercel Cron request (Authorization: Bearer $CRON_SECRET) OR a voice-
 * agent request (VOICE_AGENT_API_KEY). This lets it run automatically on a
 * schedule and on demand from the agent, while staying closed to the public.
 */

function isAuthorized(request: NextRequest): { ok: boolean; trigger: 'cron' | 'agent' | 'manual' } {
  const cronSecret = process.env.CRON_SECRET;
  const auth = request.headers.get('authorization');
  if (cronSecret && auth === `Bearer ${cronSecret}`) return { ok: true, trigger: 'cron' };
  if (isAuthorizedAgent(request)) return { ok: true, trigger: 'agent' };
  return { ok: false, trigger: 'manual' };
}

export async function POST(request: NextRequest) {
  const { ok, trigger } = isAuthorized(request);
  if (!ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apply = new URL(request.url).searchParams.get('apply') === 'true';

  try {
    const result = await runFullMaintenance(apply, trigger === 'manual' ? 'agent' : trigger);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('POST /maintenance error:', error);
    return NextResponse.json({ error: 'Maintenance run failed', detail: String(error) }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const limit = Math.min(parseInt(new URL(request.url).searchParams.get('limit') || '20'), 100);
    const rows = await db
      .select()
      .from(maintenanceRuns)
      .orderBy(desc(maintenanceRuns.createdAt))
      .limit(limit);

    const latest = rows[0] || null;
    return NextResponse.json(
      {
        latest: latest
          ? {
              status: latest.status,
              healthScore: latest.healthScore,
              securityScore: latest.securityScore,
              at: latest.createdAt,
            }
          : null,
        runs: rows.map((r) => ({
          id: r.id,
          kind: r.kind,
          status: r.status,
          healthScore: r.healthScore,
          securityScore: r.securityScore,
          applied: r.applied,
          trigger: r.trigger,
          durationMs: r.durationMs,
          findings: r.findings ? JSON.parse(r.findings) : [],
          remediations: r.remediations ? JSON.parse(r.remediations) : [],
          recommendations: r.recommendations ? JSON.parse(r.recommendations) : [],
          createdAt: r.createdAt,
        })),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('GET /maintenance error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

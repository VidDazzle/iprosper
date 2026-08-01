import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { identityVerifications, lifeProfiles } from '@/db/schema';
import { and, eq, desc } from 'drizzle-orm';
import { getOrCreateProfile } from '@/lib/life';
import { screeningConfigured, evaluateReport } from '@/lib/screening';
import { blockUser } from '@/lib/safety';

/**
 * POST /api/discovery/screening/webhook
 *
 * Background-check provider callback. The report's flagged categories are
 * evaluated: any disqualifying category (sex offense, trafficking, violent
 * felony…) → 'flagged' and the person is barred from Discover; otherwise
 * 'clear'. Only the outcome + flagged category names are stored.
 *
 * Sandbox (no provider configured): POST { sandbox:true, email, flags?:[] } to
 * simulate — pass e.g. flags:["sex_offense"] to test a denial, or omit for a
 * clean pass.
 */
export async function POST(request: NextRequest) {
  try {
    const raw = await request.text();
    let event: Record<string, unknown>;
    try { event = JSON.parse(raw); } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }); }

    let profileId: number | null = null;
    let flags: string[] = [];

    if (!screeningConfigured() && event.sandbox) {
      const me = await getOrCreateProfile(event.email as string | undefined);
      profileId = me.id;
      flags = Array.isArray(event.flags) ? (event.flags as string[]) : [];
    } else {
      // Provider path: map custom_id -> profileId, and the report's flagged
      // categories. Providers differ; Codex maps the exact payload shape here.
      const data = (event.data as Record<string, any>) || event;
      profileId = data.custom_id ? Number(data.custom_id) : null;
      flags = Array.isArray(data.flagged_categories) ? data.flagged_categories : (data.status === 'consider' ? ['review'] : []);
    }
    if (!profileId) return NextResponse.json({ received: true }, { status: 200 });

    const { status, disqualifying } = evaluateReport(flags);
    const latest = (await db.select().from(identityVerifications)
      .where(and(eq(identityVerifications.profileId, profileId), eq(identityVerifications.status, 'verified')))
      .orderBy(desc(identityVerifications.createdAt)).limit(1))[0];
    if (latest) {
      await db.update(identityVerifications)
        .set({ screening: status, screeningFlags: disqualifying.length ? JSON.stringify(disqualifying) : null })
        .where(eq(identityVerifications.id, latest.id));
    }

    // If flagged, immediately pull them out of Discover.
    if (status === 'flagged') {
      await db.update(lifeProfiles).set({ discoverable: false }).where(eq(lifeProfiles.id, profileId));
    }

    return NextResponse.json({ ok: true, status, disqualifying }, { status: 200 });
  } catch (err) {
    console.error('POST /discovery/screening/webhook error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

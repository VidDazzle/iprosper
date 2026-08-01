import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { identityVerifications } from '@/db/schema';
import { and, eq, desc } from 'drizzle-orm';
import { getOrCreateProfile } from '@/lib/life';
import { isAdultVerified } from '@/lib/safety';
import { startScreening } from '@/lib/screening';

/**
 * POST /api/discovery/screening/start { email? }
 * Begin a background check (sex-offender registry + criminal watchlist). Must be
 * identity-verified first (the check uses the verified legal name + DOB).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const me = await getOrCreateProfile(body.email);
    if (!(await isAdultVerified(me.id))) {
      return NextResponse.json({ error: 'identity_required', message: 'Verify your identity first — the background check uses your verified name and date of birth.' }, { status: 403 });
    }
    const latest = (await db.select().from(identityVerifications)
      .where(and(eq(identityVerifications.profileId, me.id), eq(identityVerifications.status, 'verified')))
      .orderBy(desc(identityVerifications.createdAt)).limit(1))[0];
    if (latest?.screening === 'clear') return NextResponse.json({ status: 'clear', alreadyCleared: true }, { status: 200 });

    const session = await startScreening(me.id, me.name || me.displayName || undefined);
    if (latest) await db.update(identityVerifications).set({ screening: 'pending' }).where(eq(identityVerifications.id, latest.id));

    return NextResponse.json({ status: 'pending', provider: session.provider, sandbox: session.sandbox, note: session.note, sessionId: session.sessionId }, { status: 200 });
  } catch (err) {
    console.error('POST /discovery/screening/start error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

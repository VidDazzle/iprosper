import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { identityVerifications } from '@/db/schema';
import { and, eq, desc } from 'drizzle-orm';
import { getOrCreateProfile } from '@/lib/life';
import { startVerification } from '@/lib/identity';

/**
 * POST /api/together/identity/start { email? }
 * Begin a document + selfie (face-match) verification with the KYC provider.
 * Returns the provider-hosted URL/secret. The license image and biometric are
 * handled by the provider — never stored here.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const me = await getOrCreateProfile(body.email);

    // Already verified? Short-circuit.
    const existing = await db
      .select()
      .from(identityVerifications)
      .where(and(eq(identityVerifications.profileId, me.id), eq(identityVerifications.status, 'verified')))
      .limit(1);
    if (existing[0]) return NextResponse.json({ status: 'verified', alreadyVerified: true }, { status: 200 });

    const origin = new URL(request.url).origin;
    const session = await startVerification(me.id, `${origin}/together?verified=1`);

    await db.insert(identityVerifications).values({
      profileId: me.id,
      provider: session.provider,
      sessionId: session.sessionId,
      status: 'pending',
      method: 'document+selfie',
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json(
      { status: 'pending', provider: session.provider, url: session.url, clientSecret: session.clientSecret ?? null, sandbox: session.sandbox, note: session.note, sessionId: session.sessionId },
      { status: 200 },
    );
  } catch (err) {
    console.error('POST /together/identity/start error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { identityVerifications } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { parseIdentityWebhook, identityConfigured } from '@/lib/identity';
import { getOrCreateProfile } from '@/lib/life';

/**
 * POST /api/together/identity/webhook
 *
 * KYC provider callback. On `identity.verification_session.verified` we flip the
 * matching row to 'verified'. In sandbox mode (no provider configured) a body of
 * { sandbox: true, email } marks that person verified so the flow is testable.
 * We store only the outcome — never the document or biometric.
 */
function ageFrom(dob: { day: number; month: number; year: number }): number {
  const today = new Date();
  let age = today.getFullYear() - dob.year;
  const m = today.getMonth() + 1 - dob.month;
  if (m < 0 || (m === 0 && today.getDate() < dob.day)) age--;
  return age;
}

export async function POST(request: NextRequest) {
  try {
    const raw = await request.text();
    const sig = request.headers.get('stripe-signature');
    const event = await parseIdentityWebhook(raw, sig);
    if (!event) return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });

    // Sandbox path: allow marking a specific person verified for development.
    // `adult` defaults to true; pass { adult: false } to test the under-18 gate.
    if (!identityConfigured() && (event as Record<string, unknown>).sandbox) {
      const email = (event as Record<string, unknown>).email as string | undefined;
      const adult = (event as Record<string, unknown>).adult !== false;
      const me = await getOrCreateProfile(email);
      const now = new Date().toISOString();
      const updated = await db
        .update(identityVerifications)
        .set({ status: 'verified', adult, verifiedAt: now })
        .where(and(eq(identityVerifications.profileId, me.id), eq(identityVerifications.status, 'pending')))
        .returning();
      if (updated.length === 0) {
        await db.insert(identityVerifications).values({ profileId: me.id, provider: 'sandbox', status: 'verified', adult, method: 'document+selfie', createdAt: now, verifiedAt: now });
      }
      return NextResponse.json({ ok: true, verified: true, adult, sandbox: true }, { status: 200 });
    }

    const type = (event as Record<string, unknown>).type as string | undefined;
    const dataObj = ((event as Record<string, unknown>).data as Record<string, unknown> | undefined)?.object as Record<string, unknown> | undefined;
    const sessionId = dataObj?.id as string | undefined;
    if (!sessionId) return NextResponse.json({ received: true }, { status: 200 });

    const now = new Date().toISOString();
    if (type === 'identity.verification_session.verified') {
      // Derive 18+ from the provider's verified date of birth. We keep only the
      // boolean, never the DOB. Under-18 is treated as a failed verification.
      const dob = (dataObj?.verified_outputs as Record<string, any> | undefined)?.dob as { day: number; month: number; year: number } | undefined;
      const adult = dob ? ageFrom(dob) >= 18 : false;
      await db.update(identityVerifications).set({ status: adult ? 'verified' : 'failed', adult, verifiedAt: now }).where(eq(identityVerifications.sessionId, sessionId));
    } else if (type === 'identity.verification_session.requires_input' || type === 'identity.verification_session.canceled') {
      await db.update(identityVerifications).set({ status: 'failed' }).where(eq(identityVerifications.sessionId, sessionId));
    }
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err) {
    console.error('POST /together/identity/webhook error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

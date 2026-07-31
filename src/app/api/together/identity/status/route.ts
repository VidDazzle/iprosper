import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { identityVerifications } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getOrCreateProfile } from '@/lib/life';
import { identityConfigured } from '@/lib/identity';

/** GET /api/together/identity/status?email= -> my current verification status. */
export async function GET(request: NextRequest) {
  try {
    const me = await getOrCreateProfile(new URL(request.url).searchParams.get('email'));
    const rows = await db
      .select()
      .from(identityVerifications)
      .where(eq(identityVerifications.profileId, me.id))
      .orderBy(desc(identityVerifications.createdAt))
      .limit(1);
    const latest = rows[0];
    return NextResponse.json(
      {
        status: latest?.status || 'unverified',
        provider: latest?.provider || null,
        verifiedAt: latest?.verifiedAt || null,
        providerConfigured: identityConfigured(),
      },
      { status: 200 },
    );
  } catch (err) {
    console.error('GET /together/identity/status error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

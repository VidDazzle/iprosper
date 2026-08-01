import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { lifeIntents } from '@/db/schema';
import { getOrCreateProfile } from '@/lib/life';
import { runConcierge } from '@/lib/concierge';
import { getPrimaryAccount, meter } from '@/lib/metering';

/**
 * POST /api/life/concierge  { email?, text }
 * The heart of Evolve Life: "I want to see a movie" -> when you're free, what's
 * on that matches your taste, where it is, reviews, showtimes. Logged so the
 * concierge learns from what you ask for.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const text = (body.text || '').toString().trim();
    if (!text) return NextResponse.json({ error: 'Tell me what you feel like doing.' }, { status: 400 });

    const profile = await getOrCreateProfile(body.email);

    // Meter the AI concierge action against the Orbit credit allowance, with a
    // hard cap: out of credits => refuse (402) so we never do paid work free.
    try {
      const account = await getPrimaryAccount();
      const m = await meter(account.id, 'orbit', 'concierge');
      if (!m.allowed) {
        return NextResponse.json(
          { error: m.message, code: 'CAP_REACHED', product: 'orbit', capReached: true },
          { status: 402 },
        );
      }
    } catch (e) {
      console.error('metering error (orbit concierge):', e);
    }

    const result = await runConcierge(
      { id: profile.id, timezone: profile.timezone, homeLat: profile.homeLat, homeLng: profile.homeLng, city: profile.city },
      text,
    );

    await db.insert(lifeIntents).values({
      profileId: profile.id,
      rawText: text,
      category: result.category,
      suggestions: JSON.stringify(result.suggestions),
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error('POST /life/concierge error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

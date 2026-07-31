import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { lifePreferences } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { getOrCreateProfile, preferencesGrouped } from '@/lib/life';
import { isValidCategory } from '@/lib/life-catalog';

/**
 * GET  /api/life/preferences?email= -> grouped preferences.
 * POST /api/life/preferences        -> set the chosen values for one category
 *   (replaces that category's set). Body: { email?, category, values: [] }.
 */
export async function GET(request: NextRequest) {
  try {
    const email = new URL(request.url).searchParams.get('email');
    const profile = await getOrCreateProfile(email);
    return NextResponse.json({ preferences: await preferencesGrouped(profile.id) }, { status: 200 });
  } catch (err) {
    console.error('GET /life/preferences error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { category } = body;
    const values: string[] = Array.isArray(body.values) ? body.values.filter((v: unknown) => typeof v === 'string' && v.trim()) : [];
    if (!category || !isValidCategory(category)) {
      return NextResponse.json({ error: 'Valid category required' }, { status: 400 });
    }
    const profile = await getOrCreateProfile(body.email);

    // Replace this category's selections atomically enough for a single owner.
    await db.delete(lifePreferences).where(and(eq(lifePreferences.profileId, profile.id), eq(lifePreferences.category, category)));
    const now = new Date().toISOString();
    const unique = Array.from(new Set(values.map((v) => v.trim())));
    if (unique.length) {
      await db.insert(lifePreferences).values(unique.map((value) => ({ profileId: profile.id, category, value, createdAt: now })));
    }
    return NextResponse.json({ preferences: await preferencesGrouped(profile.id) }, { status: 200 });
  } catch (err) {
    console.error('POST /life/preferences error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

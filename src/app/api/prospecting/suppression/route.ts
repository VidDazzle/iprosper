import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { suppressionList, prospects } from '@/db/schema';
import { and, desc, eq } from 'drizzle-orm';

export async function GET() {
  try {
    const rows = await db.select().from(suppressionList).orderBy(desc(suppressionList.createdAt)).limit(200);
    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error: ' + error, code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

// Add an identity to the global suppression / opt-out list. Also flips any
// matching prospect to 'suppressed' immediately.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { platform, authorHandle, authorExternalId, reason, source } = body;
    if (!authorHandle && !authorExternalId) {
      return NextResponse.json({ error: 'authorHandle or authorExternalId is required', code: 'MISSING_IDENTITY' }, { status: 400 });
    }
    const nowIso = new Date().toISOString();
    const inserted = await db
      .insert(suppressionList)
      .values({
        platform: platform ?? null,
        authorHandle: authorHandle ?? null,
        authorExternalId: authorExternalId ?? null,
        reason: reason ?? null,
        source: source ?? 'manual',
        createdAt: nowIso,
      })
      .returning();

    if (platform && authorExternalId) {
      await db
        .update(prospects)
        .set({ status: 'suppressed', updatedAt: nowIso })
        .where(and(eq(prospects.platform, platform), eq(prospects.authorExternalId, authorExternalId)));
    }

    return NextResponse.json(inserted[0], { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error: ' + error, code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

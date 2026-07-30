import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { termRules } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import { matchesExpression } from '@/lib/prospecting/termMatch';

export async function GET() {
  try {
    const rows = await db.select().from(termRules).orderBy(desc(termRules.updatedAt));
    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error: ' + error, code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, expression, platform, campaign, enabled } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'name is required', code: 'MISSING_NAME' }, { status: 400 });
    }
    if (!expression || typeof expression !== 'string') {
      return NextResponse.json({ error: 'expression is required', code: 'MISSING_EXPRESSION' }, { status: 400 });
    }
    // Validate the expression parses and evaluates without throwing.
    matchesExpression(expression, 'validation probe');

    const nowIso = new Date().toISOString();
    const inserted = await db
      .insert(termRules)
      .values({
        name: name.trim(),
        expression: expression.trim(),
        platform: platform ?? null,
        campaign: campaign ?? null,
        enabled: enabled ?? true,
        createdAt: nowIso,
        updatedAt: nowIso,
      })
      .returning();
    return NextResponse.json(inserted[0], { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error: ' + error, code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    if (!id) {
      return NextResponse.json({ error: 'id is required', code: 'MISSING_ID' }, { status: 400 });
    }
    const updated = await db
      .update(termRules)
      .set({ ...updates, updatedAt: new Date().toISOString() })
      .where(eq(termRules.id, id))
      .returning();
    if (updated.length === 0) {
      return NextResponse.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 });
    }
    return NextResponse.json(updated[0], { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error: ' + error, code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

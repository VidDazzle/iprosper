import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { prospects } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status');

    let query = db.select().from(prospects).$dynamic();
    if (status) query = query.where(eq(prospects.status, status));

    const rows = await query.orderBy(desc(prospects.score)).limit(limit).offset(offset);
    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error: ' + error, code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status } = body;
    if (!id) {
      return NextResponse.json({ error: 'id is required', code: 'MISSING_ID' }, { status: 400 });
    }
    const updated = await db
      .update(prospects)
      .set({ status, updatedAt: new Date().toISOString() })
      .where(eq(prospects.id, id))
      .returning();
    if (updated.length === 0) {
      return NextResponse.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 });
    }
    return NextResponse.json(updated[0], { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error: ' + error, code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

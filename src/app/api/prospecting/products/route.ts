import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { products } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';

const VALID_SOURCES = [
  'alibaba', 'cj', 'aliexpress', 'amazon_associates', 'shareasale', 'impact', 'clickbank', 'own',
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
    const offset = parseInt(searchParams.get('offset') || '0');
    const rows = await db
      .select()
      .from(products)
      .orderBy(desc(products.updatedAt))
      .limit(limit)
      .offset(offset);
    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error: ' + error, code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { source, title } = body;

    if (!source || !VALID_SOURCES.includes(source)) {
      return NextResponse.json({ error: `source must be one of ${VALID_SOURCES.join(', ')}`, code: 'INVALID_SOURCE' }, { status: 400 });
    }
    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'title is required', code: 'MISSING_TITLE' }, { status: 400 });
    }

    const nowIso = new Date().toISOString();
    const inserted = await db
      .insert(products)
      .values({
        source,
        externalId: body.externalId ?? null,
        title: title.trim(),
        description: body.description ?? null,
        category: body.category ?? null,
        priceUsd: body.priceUsd ?? null,
        supplierCostUsd: body.supplierCostUsd ?? null,
        marginPct: body.marginPct ?? null,
        shipDaysMin: body.shipDaysMin ?? null,
        shipDaysMax: body.shipDaysMax ?? null,
        reviewScore: body.reviewScore ?? null,
        reviewCount: body.reviewCount ?? null,
        affiliateNetwork: body.affiliateNetwork ?? null,
        affiliatePayoutUsd: body.affiliatePayoutUsd ?? null,
        affiliateUrl: body.affiliateUrl ?? null,
        landingUrl: body.landingUrl ?? null,
        embedding: body.embedding ? JSON.stringify(body.embedding) : null,
        active: body.active ?? true,
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
    if (updates.embedding) updates.embedding = JSON.stringify(updates.embedding);
    const updated = await db
      .update(products)
      .set({ ...updates, updatedAt: new Date().toISOString() })
      .where(eq(products.id, id))
      .returning();
    if (updated.length === 0) {
      return NextResponse.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 });
    }
    return NextResponse.json(updated[0], { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error: ' + error, code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

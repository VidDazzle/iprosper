import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { products } from '@/db/schema';
import { eq } from 'drizzle-orm';

/** GET /api/products/[id] — by numeric id or slug (public product page). */
type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const key = (await params).id;
    const asId = parseInt(key, 10);
    let row;
    if (!isNaN(asId) && String(asId) === key) {
      row = (await db.select().from(products).where(eq(products.id, asId)).limit(1))[0];
    }
    if (!row) {
      row = (await db.select().from(products).where(eq(products.slug, key)).limit(1))[0];
    }
    if (!row) return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    return NextResponse.json({ product: row }, { status: 200 });
  } catch (error) {
    console.error('GET /products/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

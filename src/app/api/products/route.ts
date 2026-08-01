import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { products } from '@/db/schema';
import { desc } from 'drizzle-orm';

/**
 * GET  /api/products   -> all products
 * POST /api/products   -> create a product (generates a shareable slug)
 */
function slugify(name: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'product';
  return `${base}-${Math.random().toString(36).slice(2, 6)}`;
}

export async function GET() {
  try {
    const rows = await db.select().from(products).orderBy(desc(products.createdAt)).limit(200);
    return NextResponse.json({ products: rows }, { status: 200 });
  } catch (error) {
    console.error('GET /products error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }
    const priceCents = Math.round(Number(body.priceCents ?? (body.price ? body.price * 100 : 0)));
    if (!Number.isFinite(priceCents) || priceCents < 0) {
      return NextResponse.json({ error: 'price must be a non-negative number' }, { status: 400 });
    }
    const inserted = await db
      .insert(products)
      .values({
        slug: slugify(body.name),
        name: body.name.trim(),
        description: body.description || null,
        priceCents,
        currency: (body.currency || 'usd').toLowerCase(),
        imageUrl: body.imageUrl || null,
        active: body.active !== false,
        createdAt: new Date().toISOString(),
      })
      .returning();
    return NextResponse.json({ product: inserted[0] }, { status: 201 });
  } catch (error) {
    console.error('POST /products error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

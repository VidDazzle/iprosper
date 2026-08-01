import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { deliverableItems } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { completeMultipart } from '@/lib/storage';

/** POST /api/deliverables/[id]/items/[itemId]/complete — finalize a file upload. */
type Params = { params: Promise<{ id: string; itemId: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const itemId = parseInt((await params).itemId, 10);
    if (isNaN(itemId)) return NextResponse.json({ error: 'Invalid itemId' }, { status: 400 });

    const rows = await db.select().from(deliverableItems).where(eq(deliverableItems.id, itemId)).limit(1);
    const item = rows[0];
    if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    if (item.status === 'uploaded') return NextResponse.json({ item }, { status: 200 });

    if (item.uploadId && item.storageKey) {
      const body = await request.json().catch(() => ({}));
      const parts = Array.isArray(body.parts) ? body.parts : [];
      if (parts.length === 0) {
        return NextResponse.json({ error: 'parts (with etags) required for multipart' }, { status: 400 });
      }
      await completeMultipart(item.storageKey, item.uploadId, parts);
    }

    const updated = await db
      .update(deliverableItems)
      .set({ status: 'uploaded', uploadId: null })
      .where(eq(deliverableItems.id, itemId))
      .returning();
    return NextResponse.json({ item: updated[0] }, { status: 200 });
  } catch (error) {
    console.error('POST deliverable item complete error:', error);
    return NextResponse.json({ error: 'Internal server error', detail: String(error) }, { status: 500 });
  }
}

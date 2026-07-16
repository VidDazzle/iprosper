import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { deliverableItems, deliverableReviews } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import { findDeliverable } from '@/lib/deliverables';
import { getDownloadUrl } from '@/lib/storage';

/**
 * GET /api/deliverables/[id]  -> the package with its items (fresh download
 * URLs) and the client's review history. id = numeric id or public id, so the
 * same endpoint serves the internal manager and the client review page.
 */
type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const d = await findDeliverable((await params).id);
    if (!d) return NextResponse.json({ error: 'Deliverable not found' }, { status: 404 });

    const items = await db
      .select()
      .from(deliverableItems)
      .where(eq(deliverableItems.deliverableId, d.id))
      .orderBy(asc(deliverableItems.createdAt));

    const reviews = await db
      .select()
      .from(deliverableReviews)
      .where(eq(deliverableReviews.deliverableId, d.id))
      .orderBy(asc(deliverableReviews.createdAt));

    const itemsOut = await Promise.all(
      items.map(async (it) => ({
        id: it.id,
        kind: it.kind,
        title: it.title,
        description: it.description,
        url:
          it.kind === 'file' && it.status === 'uploaded' && it.storageKey
            ? await getDownloadUrl(it.storageKey, it.title)
            : it.url,
        mimeType: it.mimeType,
        sizeBytes: it.sizeBytes,
        status: it.status,
      })),
    );

    return NextResponse.json({ deliverable: d, items: itemsOut, reviews }, { status: 200 });
  } catch (error) {
    console.error('GET /deliverables/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

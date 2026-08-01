import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { meetingAssets } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { completeMultipart } from '@/lib/storage';

/**
 * POST /api/meetings/[id]/assets/[assetId]/complete
 * Body (multipart only): { parts: [{ partNumber, etag }] }
 * Finalizes a shared-asset upload.
 */
type Params = { params: Promise<{ id: string; assetId: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const assetId = parseInt((await params).assetId, 10);
    if (isNaN(assetId)) return NextResponse.json({ error: 'Invalid assetId' }, { status: 400 });

    const rows = await db.select().from(meetingAssets).where(eq(meetingAssets.id, assetId)).limit(1);
    const asset = rows[0];
    if (!asset) return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    if (asset.status === 'uploaded') return NextResponse.json({ asset }, { status: 200 });

    if (asset.uploadId && asset.storageKey) {
      const body = await request.json().catch(() => ({}));
      const parts = Array.isArray(body.parts) ? body.parts : [];
      if (parts.length === 0) {
        return NextResponse.json({ error: 'parts (with etags) required for multipart' }, { status: 400 });
      }
      await completeMultipart(asset.storageKey, asset.uploadId, parts);
    }

    const updated = await db
      .update(meetingAssets)
      .set({ status: 'uploaded', uploadId: null })
      .where(eq(meetingAssets.id, assetId))
      .returning();
    return NextResponse.json({ asset: updated[0] }, { status: 200 });
  } catch (error) {
    console.error('POST asset complete error:', error);
    return NextResponse.json({ error: 'Internal server error', detail: String(error) }, { status: 500 });
  }
}

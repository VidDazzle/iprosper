import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { meetingAssets, assetReviews } from '@/db/schema';
import { eq, asc, inArray } from 'drizzle-orm';
import { findMeeting } from '@/lib/meetings';
import { storageConfigured, createUpload, makeStorageKey, getDownloadUrl, MAX_OBJECT_SIZE } from '@/lib/storage';

/**
 * GET  /api/meetings/[id]/assets   -> shared assets (video/image/slideshow/doc)
 *                                     with their per-revision reviews + a fresh
 *                                     download URL each.
 * POST /api/meetings/[id]/assets   -> register an asset and get a presigned
 *                                     upload ticket (direct-to-storage, any size).
 */
type Params = { params: Promise<{ id: string }> };

const KINDS = ['video', 'image', 'slideshow', 'document'];

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const meeting = await findMeeting((await params).id);
    if (!meeting) return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });

    const assets = await db
      .select()
      .from(meetingAssets)
      .where(eq(meetingAssets.meetingId, meeting.id))
      .orderBy(asc(meetingAssets.createdAt));
    const ids = assets.map((a) => a.id);
    const reviews = ids.length
      ? await db.select().from(assetReviews).where(inArray(assetReviews.assetId, ids))
      : [];

    const out = await Promise.all(
      assets.map(async (a) => ({
        id: a.id,
        kind: a.kind,
        title: a.title,
        mimeType: a.mimeType,
        sizeBytes: a.sizeBytes,
        status: a.status,
        revision: a.revision,
        uploadedByName: a.uploadedByName,
        downloadUrl:
          a.status === 'uploaded' && a.storageKey ? await getDownloadUrl(a.storageKey, a.title) : null,
        reviews: reviews.filter((r) => r.assetId === a.id),
      })),
    );
    return NextResponse.json({ assets: out }, { status: 200 });
  } catch (error) {
    console.error('GET /meetings/[id]/assets error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    if (!storageConfigured()) {
      return NextResponse.json(
        { error: 'Object storage not configured', code: 'NO_STORAGE', hint: 'Set S3_* env vars.' },
        { status: 503 },
      );
    }
    const meeting = await findMeeting((await params).id);
    if (!meeting) return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });

    const body = await request.json();
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const sizeBytes = Number(body.sizeBytes);
    const kind = KINDS.includes(body.kind) ? body.kind : 'document';
    const mimeType = body.mimeType || 'application/octet-stream';
    if (!title) return NextResponse.json({ error: 'title is required' }, { status: 400 });
    if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
      return NextResponse.json({ error: 'sizeBytes must be positive' }, { status: 400 });
    }
    if (sizeBytes > MAX_OBJECT_SIZE) {
      return NextResponse.json({ error: 'File too large' }, { status: 413 });
    }

    const key = makeStorageKey(title);
    const ticket = await createUpload(key, sizeBytes, mimeType);

    const inserted = await db
      .insert(meetingAssets)
      .values({
        meetingId: meeting.id,
        kind,
        title,
        mimeType,
        sizeBytes,
        storageKey: key,
        uploadId: ticket.mode === 'multipart' ? ticket.uploadId : null,
        status: 'pending',
        revision: Number.isInteger(body.revision) && body.revision > 0 ? body.revision : 1,
        uploadedByName: body.uploadedByName || null,
        uploadedByEmail: body.uploadedByEmail || null,
        createdAt: new Date().toISOString(),
      })
      .returning();

    return NextResponse.json({ assetId: inserted[0].id, ...ticket }, { status: 201 });
  } catch (error) {
    console.error('POST /meetings/[id]/assets error:', error);
    return NextResponse.json({ error: 'Internal server error', detail: String(error) }, { status: 500 });
  }
}

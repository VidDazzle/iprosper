import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { deliverableItems } from '@/db/schema';
import { findDeliverable, ITEM_KINDS } from '@/lib/deliverables';
import { storageConfigured, createUpload, makeStorageKey, MAX_OBJECT_SIZE } from '@/lib/storage';

/**
 * POST /api/deliverables/[id]/items
 *
 * Add an item to a delivery package. Two shapes:
 *  - Link / Voice AI agent / external: { kind: "link"|"voice_agent", title, url, description? }
 *    → registered immediately (no upload).
 *  - File (document/video/image): { kind, title, mimeType, sizeBytes }
 *    → returns a presigned upload ticket; finalize via /items/[itemId]/complete.
 */
type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const d = await findDeliverable((await params).id);
    if (!d) return NextResponse.json({ error: 'Deliverable not found' }, { status: 404 });

    const body = await request.json();
    const kind = ITEM_KINDS.includes(body.kind) ? body.kind : 'file';
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const nowIso = new Date().toISOString();

    // URL-based items (link, voice_agent, or any item given a url) — no upload.
    if (kind === 'link' || kind === 'voice_agent' || (body.url && !body.sizeBytes)) {
      const url = typeof body.url === 'string' ? body.url.trim() : '';
      if (!url || !/^https?:\/\//i.test(url)) {
        return NextResponse.json({ error: 'A valid http(s) url is required' }, { status: 400 });
      }
      const inserted = await db
        .insert(deliverableItems)
        .values({
          deliverableId: d.id,
          kind,
          title: title || url,
          description: body.description || null,
          url,
          status: 'ready',
          createdAt: nowIso,
        })
        .returning();
      return NextResponse.json({ item: inserted[0], mode: 'link' }, { status: 201 });
    }

    // File upload item.
    if (!title) return NextResponse.json({ error: 'title is required' }, { status: 400 });
    if (!storageConfigured()) {
      return NextResponse.json({ error: 'Object storage not configured', code: 'NO_STORAGE' }, { status: 503 });
    }
    const sizeBytes = Number(body.sizeBytes);
    if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
      return NextResponse.json({ error: 'sizeBytes must be positive' }, { status: 400 });
    }
    if (sizeBytes > MAX_OBJECT_SIZE) return NextResponse.json({ error: 'File too large' }, { status: 413 });

    const key = makeStorageKey(title);
    const ticket = await createUpload(key, sizeBytes, body.mimeType || 'application/octet-stream');
    const inserted = await db
      .insert(deliverableItems)
      .values({
        deliverableId: d.id,
        kind,
        title,
        description: body.description || null,
        mimeType: body.mimeType || 'application/octet-stream',
        sizeBytes,
        storageKey: key,
        uploadId: ticket.mode === 'multipart' ? ticket.uploadId : null,
        status: 'pending',
        createdAt: nowIso,
      })
      .returning();

    return NextResponse.json({ item: inserted[0], ...ticket }, { status: 201 });
  } catch (error) {
    console.error('POST /deliverables/[id]/items error:', error);
    return NextResponse.json({ error: 'Internal server error', detail: String(error) }, { status: 500 });
  }
}

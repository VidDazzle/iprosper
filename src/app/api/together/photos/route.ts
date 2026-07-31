import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { sharedPhotos } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getOrCreateProfile } from '@/lib/life';
import { activeConnectionFor, isVerified } from '@/lib/together';
import { storageConfigured, createUpload, makeStorageKey, getDownloadUrl } from '@/lib/storage';

/**
 * GET  /api/together/photos?email=  -> photos in my connection. A photo's image
 *      is only returned if it's revealed OR I own it — otherwise it's "locked".
 * POST /api/together/photos         -> add a photo. REQUIRES identity
 *      verification. Either pass a { url } or request a presigned upload with
 *      { filename, sizeBytes } (stored in the encrypted object store). New
 *      photos start locked until the owner reveals them.
 */
export async function GET(request: NextRequest) {
  try {
    const me = await getOrCreateProfile(new URL(request.url).searchParams.get('email'));
    const conn = await activeConnectionFor(me.id);
    if (!conn) return NextResponse.json({ photos: [] }, { status: 200 });
    const rows = await db.select().from(sharedPhotos).where(eq(sharedPhotos.connectionId, conn.id));

    const photos = await Promise.all(
      rows.map(async (p) => {
        const mine = p.ownerProfileId === me.id;
        const visible = mine || p.revealed;
        let url: string | null = null;
        if (visible) {
          url = p.url || (p.storageKey ? await getDownloadUrl(p.storageKey, p.caption || 'photo').catch(() => null) : null);
        }
        return {
          id: p.id, mine, caption: p.caption, revealed: p.revealed, revealRequested: p.revealRequested,
          locked: !visible, url, createdAt: p.createdAt,
        };
      }),
    );
    return NextResponse.json({ photos }, { status: 200 });
  } catch (err) {
    console.error('GET /together/photos error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const me = await getOrCreateProfile(body.email);
    const conn = await activeConnectionFor(me.id);
    if (!conn) return NextResponse.json({ error: 'No active connection' }, { status: 400 });

    // Gate: identity verification is required before sharing photos.
    if (!(await isVerified(me.id))) {
      return NextResponse.json({ error: 'identity_required', message: 'Verify your identity (driver’s license + face match) before sharing photos.' }, { status: 403 });
    }

    const now = new Date().toISOString();
    // Presigned upload path (large images/videos → encrypted object store).
    if (body.filename && body.sizeBytes) {
      if (!storageConfigured()) return NextResponse.json({ error: 'Object storage not configured (set S3_* to upload files).' }, { status: 503 });
      const key = makeStorageKey(body.filename);
      const ticket = await createUpload(key, Number(body.sizeBytes), body.mimeType || 'image/jpeg');
      const inserted = await db.insert(sharedPhotos).values({
        connectionId: conn.id, ownerProfileId: me.id, storageKey: key, caption: body.caption || null,
        revealed: false, revealRequested: false, createdAt: now,
      }).returning();
      return NextResponse.json({ photo: inserted[0], upload: ticket }, { status: 201 });
    }

    // Direct URL path (already-hosted image).
    if (body.url) {
      const inserted = await db.insert(sharedPhotos).values({
        connectionId: conn.id, ownerProfileId: me.id, url: String(body.url), caption: body.caption || null,
        revealed: false, revealRequested: false, createdAt: now,
      }).returning();
      return NextResponse.json({ photo: inserted[0] }, { status: 201 });
    }

    return NextResponse.json({ error: 'Provide a url, or filename + sizeBytes for an upload.' }, { status: 400 });
  } catch (err) {
    console.error('POST /together/photos error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

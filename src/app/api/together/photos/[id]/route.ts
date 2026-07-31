import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { sharedPhotos } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getOrCreateProfile } from '@/lib/life';
import { activeConnectionFor } from '@/lib/together';

/**
 * PATCH /api/together/photos/[id]  { email?, action }
 *   - reveal : owner unlocks the photo for the partner
 *   - hide   : owner re-locks it
 *   - request: the partner asks the owner to reveal it ("ask for a photo")
 */
type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const id = Number((await params).id);
    const body = await request.json().catch(() => ({}));
    const me = await getOrCreateProfile(body.email);
    const conn = await activeConnectionFor(me.id);
    if (!conn) return NextResponse.json({ error: 'No active connection' }, { status: 400 });

    const rows = await db.select().from(sharedPhotos).where(eq(sharedPhotos.id, id)).limit(1);
    const photo = rows[0];
    if (!photo || photo.connectionId !== conn.id) return NextResponse.json({ error: 'Photo not found' }, { status: 404 });

    const mine = photo.ownerProfileId === me.id;
    if (body.action === 'reveal' || body.action === 'hide') {
      if (!mine) return NextResponse.json({ error: 'Only the owner can reveal or hide this photo.' }, { status: 403 });
      const updated = await db.update(sharedPhotos)
        .set({ revealed: body.action === 'reveal', revealRequested: false })
        .where(eq(sharedPhotos.id, id)).returning();
      return NextResponse.json({ photo: { id: updated[0].id, revealed: updated[0].revealed } }, { status: 200 });
    }
    if (body.action === 'request') {
      if (mine) return NextResponse.json({ error: "It's your own photo." }, { status: 400 });
      await db.update(sharedPhotos).set({ revealRequested: true }).where(eq(sharedPhotos.id, id));
      return NextResponse.json({ ok: true, requested: true }, { status: 200 });
    }
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    console.error('PATCH /together/photos/[id] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

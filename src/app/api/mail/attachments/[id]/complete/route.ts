import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { mailAttachments } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { completeMultipart } from '@/lib/storage';

/**
 * POST /api/mail/attachments/[id]/complete
 * Body (multipart only): { parts: [{ partNumber, etag }] }
 *
 * Finalizes an upload. For a single PUT there's nothing to assemble — we just
 * mark it uploaded. For a multipart upload we assemble the parts server-side
 * using the ETags the client collected from each part PUT.
 */
type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const id = parseInt((await params).id, 10);
    if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

    const rows = await db.select().from(mailAttachments).where(eq(mailAttachments.id, id)).limit(1);
    const att = rows[0];
    if (!att) return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    if (att.status === 'uploaded') {
      return NextResponse.json({ attachment: att, alreadyComplete: true }, { status: 200 });
    }

    if (att.uploadId) {
      const body = await request.json().catch(() => ({}));
      const parts = Array.isArray(body.parts) ? body.parts : [];
      if (parts.length === 0) {
        return NextResponse.json({ error: 'parts (with etags) are required for multipart uploads' }, { status: 400 });
      }
      await completeMultipart(att.storageKey, att.uploadId, parts);
    }

    const updated = await db
      .update(mailAttachments)
      .set({ status: 'uploaded', uploadId: null, uploadedAt: new Date().toISOString() })
      .where(eq(mailAttachments.id, id))
      .returning();

    return NextResponse.json({ attachment: updated[0] }, { status: 200 });
  } catch (error) {
    console.error('POST /mail/attachments/[id]/complete error:', error);
    return NextResponse.json({ error: 'Internal server error', detail: String(error) }, { status: 500 });
  }
}

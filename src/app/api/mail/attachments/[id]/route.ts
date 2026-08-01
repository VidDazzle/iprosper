import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { mailAttachments } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getDownloadUrl, deleteObject, abortMultipart, humanSize } from '@/lib/storage';

/**
 * GET    /api/mail/attachments/[id]  -> metadata + a fresh presigned download URL.
 * DELETE /api/mail/attachments/[id]  -> remove the object and the row (aborts
 *                                       an in-flight multipart upload first).
 */
type Params = { params: Promise<{ id: string }> };

async function findRow(id: number) {
  const rows = await db.select().from(mailAttachments).where(eq(mailAttachments.id, id)).limit(1);
  return rows[0] || null;
}

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const id = parseInt((await params).id, 10);
    if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    const att = await findRow(id);
    if (!att) return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    if (att.status !== 'uploaded') {
      return NextResponse.json({ error: 'Attachment upload not complete', status: att.status }, { status: 409 });
    }
    const downloadUrl = await getDownloadUrl(att.storageKey, att.filename);
    return NextResponse.json(
      {
        attachment: {
          id: att.id,
          filename: att.filename,
          mimeType: att.mimeType,
          sizeBytes: att.sizeBytes,
          sizeHuman: humanSize(att.sizeBytes),
          status: att.status,
          createdAt: att.createdAt,
        },
        downloadUrl,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('GET /mail/attachments/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const id = parseInt((await params).id, 10);
    if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    const att = await findRow(id);
    if (!att) return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });

    try {
      if (att.uploadId) await abortMultipart(att.storageKey, att.uploadId);
      else await deleteObject(att.storageKey);
    } catch (err) {
      // Object may not exist yet (upload never happened) — proceed to drop the row.
      console.warn('Storage delete warning:', err);
    }

    await db.delete(mailAttachments).where(eq(mailAttachments.id, id));
    return NextResponse.json({ deleted: true, id }, { status: 200 });
  } catch (error) {
    console.error('DELETE /mail/attachments/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

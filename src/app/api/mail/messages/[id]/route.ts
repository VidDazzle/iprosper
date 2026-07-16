import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { mailMessages, mailAttachments } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { encryptionConfigured } from '@/lib/crypto';
import { toClientMessage, StoredMessageRow } from '@/lib/mailbox';
import { humanSize } from '@/lib/storage';

/**
 * GET    /api/mail/messages/[id]  -> full decrypted message (marks read).
 * PATCH  /api/mail/messages/[id]  -> update status/starred/priority/category.
 * DELETE /api/mail/messages/[id]  -> soft-delete (status=trash) or ?hard=true.
 */

type Params = { params: Promise<{ id: string }> };

async function findRow(id: number) {
  const rows = await db.select().from(mailMessages).where(eq(mailMessages.id, id)).limit(1);
  return (rows[0] as StoredMessageRow) || null;
}

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    if (!encryptionConfigured()) {
      return NextResponse.json({ error: 'MAIL_ENCRYPTION_KEY not configured' }, { status: 503 });
    }
    const id = parseInt((await params).id, 10);
    if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    const row = await findRow(id);
    if (!row) return NextResponse.json({ error: 'Message not found' }, { status: 404 });

    // Auto-mark inbound messages as read on open.
    if (row.direction === 'inbound' && row.status === 'unread') {
      await db.update(mailMessages).set({ status: 'read' }).where(eq(mailMessages.id, id));
      row.status = 'read';
    }

    const atts = await db
      .select()
      .from(mailAttachments)
      .where(and(eq(mailAttachments.messageId, id), eq(mailAttachments.status, 'uploaded')));
    const attachments = atts.map((a) => ({
      id: a.id,
      filename: a.filename,
      mimeType: a.mimeType,
      sizeBytes: a.sizeBytes,
      sizeHuman: humanSize(a.sizeBytes),
    }));

    return NextResponse.json({ message: { ...toClientMessage(row), attachments } }, { status: 200 });
  } catch (error) {
    console.error('GET /mail/messages/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const id = parseInt((await params).id, 10);
    if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    const row = await findRow(id);
    if (!row) return NextResponse.json({ error: 'Message not found' }, { status: 404 });

    const body = await request.json();
    const patch: Record<string, unknown> = {};
    if (body.status !== undefined) patch.status = body.status;
    if (body.starred !== undefined) patch.starred = Boolean(body.starred);
    if (body.priority !== undefined) patch.priority = body.priority;
    if (body.category !== undefined) patch.category = body.category;
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 });
    }

    const updated = await db.update(mailMessages).set(patch).where(eq(mailMessages.id, id)).returning();
    return NextResponse.json({ message: toClientMessage(updated[0] as unknown as StoredMessageRow, false) }, { status: 200 });
  } catch (error) {
    console.error('PATCH /mail/messages/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const id = parseInt((await params).id, 10);
    if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    const row = await findRow(id);
    if (!row) return NextResponse.json({ error: 'Message not found' }, { status: 404 });

    const hard = new URL(request.url).searchParams.get('hard') === 'true';
    if (hard) {
      await db.delete(mailMessages).where(eq(mailMessages.id, id));
      return NextResponse.json({ deleted: true, id }, { status: 200 });
    }
    await db.update(mailMessages).set({ status: 'trash' }).where(eq(mailMessages.id, id));
    return NextResponse.json({ trashed: true, id }, { status: 200 });
  } catch (error) {
    console.error('DELETE /mail/messages/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

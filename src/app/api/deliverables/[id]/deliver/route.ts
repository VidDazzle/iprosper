import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { deliverables, deliverableItems, mailMessages } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { findDeliverable, renderDeliveryEmail } from '@/lib/deliverables';
import { encryptionConfigured } from '@/lib/crypto';
import { buildEncryptedFields, newThreadId, mailboxAddress } from '@/lib/mailbox';
import { deliverEmail } from '@/lib/mailer';

/**
 * POST /api/deliverables/[id]/deliver
 *
 * Marks the package delivered and emails the client a link to review, approve,
 * or request revisions. The client review page is public (unguessable id) so
 * the client doesn't need an account.
 */
type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const d = await findDeliverable((await params).id);
    if (!d) return NextResponse.json({ error: 'Deliverable not found' }, { status: 404 });

    const items = await db
      .select()
      .from(deliverableItems)
      .where(eq(deliverableItems.deliverableId, d.id));
    if (items.length === 0) {
      return NextResponse.json({ error: 'Add at least one item before delivering' }, { status: 400 });
    }

    const nowIso = new Date().toISOString();
    await db
      .update(deliverables)
      .set({ status: 'delivered', deliveredAt: nowIso, updatedAt: nowIso })
      .where(eq(deliverables.id, d.id));

    const origin = new URL(request.url).origin;
    const reviewUrl = `${origin}/deliver/${d.publicId}`;

    let emailed = false;
    if (d.clientEmail) {
      const subject = `Your project is ready: ${d.title}`;
      const bodyText = renderDeliveryEmail(
        d.title,
        d.clientName,
        d.message,
        items.map((i) => ({ title: i.title, kind: i.kind })),
        reviewUrl,
      );
      const owner = mailboxAddress();
      if (encryptionConfigured()) {
        const enc = buildEncryptedFields(subject, bodyText);
        await db.insert(mailMessages).values({
          threadId: newThreadId(),
          direction: 'outbound',
          fromEmail: owner,
          toEmails: d.clientEmail,
          ccEmails: null,
          subjectEncrypted: enc.subjectEncrypted,
          bodyEncrypted: enc.bodyEncrypted,
          preview: enc.preview,
          status: 'sent',
          starred: false,
          priority: 'normal',
          category: 'delivery',
          source: 'ai',
          createdAt: nowIso,
        });
      }
      await deliverEmail({ from: owner, to: [d.clientEmail], subject, body: bodyText });
      emailed = true;
    }

    return NextResponse.json({ delivered: true, reviewUrl, emailedClient: emailed }, { status: 200 });
  } catch (error) {
    console.error('POST /deliverables/[id]/deliver error:', error);
    return NextResponse.json({ error: 'Internal server error', detail: String(error) }, { status: 500 });
  }
}

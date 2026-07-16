import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { deliverables, deliverableReviews, mailMessages } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { findDeliverable } from '@/lib/deliverables';
import { encryptionConfigured } from '@/lib/crypto';
import { buildEncryptedFields, newThreadId, mailboxAddress } from '@/lib/mailbox';
import { deliverEmail } from '@/lib/mailer';

/**
 * POST /api/deliverables/[id]/review
 * Body: { reviewerName, reviewerEmail?, decision, revisionDetail?, itemId? }
 *
 * The client's decision on a delivery: "approved", or "revision_requested" WITH
 * the specific requested change (required). Updates the package status and
 * notifies the host mailbox so the team sees the request immediately.
 */
type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const d = await findDeliverable((await params).id);
    if (!d) return NextResponse.json({ error: 'Deliverable not found' }, { status: 404 });

    const body = await request.json();
    const reviewerName = typeof body.reviewerName === 'string' ? body.reviewerName.trim() : '';
    const decision = body.decision === 'approved' ? 'approved' : 'revision_requested';
    const revisionDetail = typeof body.revisionDetail === 'string' ? body.revisionDetail.trim() : '';
    if (!reviewerName) return NextResponse.json({ error: 'reviewerName is required' }, { status: 400 });
    if (decision === 'revision_requested' && !revisionDetail) {
      return NextResponse.json(
        { error: 'Please describe the specific revision you are requesting.', code: 'REVISION_DETAIL_REQUIRED' },
        { status: 400 },
      );
    }

    const nowIso = new Date().toISOString();
    const inserted = await db
      .insert(deliverableReviews)
      .values({
        deliverableId: d.id,
        itemId: Number.isInteger(body.itemId) ? body.itemId : null,
        reviewerName,
        reviewerEmail: body.reviewerEmail || null,
        decision,
        revisionDetail: revisionDetail || null,
        createdAt: nowIso,
      })
      .returning();

    await db
      .update(deliverables)
      .set({ status: decision, updatedAt: nowIso })
      .where(eq(deliverables.id, d.id));

    // Notify the internal mailbox so the team sees the decision.
    if (encryptionConfigured()) {
      const owner = mailboxAddress();
      const subject =
        decision === 'approved'
          ? `✅ Approved: ${d.title}`
          : `✏️ Revision requested: ${d.title}`;
      const bodyText =
        decision === 'approved'
          ? `${reviewerName} approved the delivery "${d.title}".`
          : `${reviewerName} requested a revision on "${d.title}":\n\n${revisionDetail}`;
      const enc = buildEncryptedFields(subject, bodyText);
      await db.insert(mailMessages).values({
        threadId: newThreadId(),
        direction: 'inbound',
        fromEmail: body.reviewerEmail || 'client@evolve.ai',
        toEmails: owner,
        ccEmails: null,
        subjectEncrypted: enc.subjectEncrypted,
        bodyEncrypted: enc.bodyEncrypted,
        preview: enc.preview,
        status: 'unread',
        starred: decision !== 'approved',
        priority: decision === 'approved' ? 'normal' : 'high',
        category: 'delivery',
        source: 'api',
        createdAt: nowIso,
      });
      await deliverEmail({ from: owner, to: [owner], subject, body: bodyText });
    }

    return NextResponse.json({ review: inserted[0], status: decision }, { status: 201 });
  } catch (error) {
    console.error('POST /deliverables/[id]/review error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

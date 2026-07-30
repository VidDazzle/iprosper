import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { outreachMessages, prospects, connectors, auditLog } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import { getConnector, credsFromEnv } from '@/lib/prospecting/connectors';
import { checkOutreachAllowed, enforceDisclosure } from '@/lib/prospecting/compliance';
import { isSuppressed } from '@/lib/prospecting/pipeline';
import type { Platform } from '@/lib/prospecting/types';

const now = () => new Date().toISOString();

// List outreach messages, optionally filtered by status (default: the review queue).
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') ?? 'pending_review';
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
    const rows = await db
      .select()
      .from(outreachMessages)
      .where(eq(outreachMessages.status, status))
      .orderBy(desc(outreachMessages.createdAt))
      .limit(limit);
    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error: ' + error, code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

// Review action: approve (optionally edit body), reject, or send.
// action ∈ 'approve' | 'reject' | 'send'
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, action, editedBody, reviewer, rejectionReason } = body;
    if (!id || !action) {
      return NextResponse.json({ error: 'id and action are required', code: 'MISSING_FIELDS' }, { status: 400 });
    }

    const [msg] = await db.select().from(outreachMessages).where(eq(outreachMessages.id, id)).limit(1);
    if (!msg) {
      return NextResponse.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 });
    }

    if (action === 'reject') {
      const updated = await db
        .update(outreachMessages)
        .set({ status: 'rejected', reviewedBy: reviewer ?? 'unknown', rejectionReason: rejectionReason ?? null, updatedAt: now() })
        .where(eq(outreachMessages.id, id))
        .returning();
      await db.insert(auditLog).values({ actor: reviewer ?? 'unknown', action: 'outreach_rejected', entityType: 'outreach', entityId: id, detail: rejectionReason ?? '', createdAt: now() });
      return NextResponse.json(updated[0], { status: 200 });
    }

    if (action === 'approve') {
      // Re-enforce disclosure on any edited body before approval.
      const finalBody = enforceDisclosure(editedBody ?? msg.draftBody, msg.disclosureText ?? '');
      const updated = await db
        .update(outreachMessages)
        .set({ status: 'approved', draftBody: finalBody, reviewedBy: reviewer ?? 'unknown', updatedAt: now() })
        .where(eq(outreachMessages.id, id))
        .returning();
      await db.insert(auditLog).values({ actor: reviewer ?? 'unknown', action: 'outreach_approved', entityType: 'outreach', entityId: id, detail: '', createdAt: now() });
      return NextResponse.json(updated[0], { status: 200 });
    }

    if (action === 'send') {
      if (msg.status !== 'approved') {
        return NextResponse.json({ error: 'Message must be approved before sending', code: 'NOT_APPROVED' }, { status: 400 });
      }
      const [prospect] = await db.select().from(prospects).where(eq(prospects.id, msg.prospectId)).limit(1);
      if (!prospect) {
        return NextResponse.json({ error: 'Prospect not found', code: 'NOT_FOUND' }, { status: 404 });
      }
      const platform = prospect.platform as Platform;

      // Final compliance gates at the send boundary.
      const gate = checkOutreachAllowed(platform, msg.channel as 'public_reply' | 'dm');
      if (!gate.allowed) {
        return NextResponse.json({ error: gate.reason, code: 'BLOCKED_BY_POLICY' }, { status: 403 });
      }
      if (await isSuppressed(prospect.platform, prospect.authorExternalId, prospect.authorHandle ?? undefined)) {
        await db.update(outreachMessages).set({ status: 'failed', sendError: 'suppressed', updatedAt: now() }).where(eq(outreachMessages.id, id));
        return NextResponse.json({ error: 'Prospect is suppressed', code: 'SUPPRESSED' }, { status: 403 });
      }

      const connector = getConnector(platform);
      if (!connector) {
        return NextResponse.json({ error: `No connector for ${platform}`, code: 'NO_CONNECTOR' }, { status: 400 });
      }

      // Look up the source mention's external id for reply targeting.
      const [conn] = msg.connectorId
        ? await db.select().from(connectors).where(eq(connectors.id, msg.connectorId)).limit(1)
        : [undefined];

      const result = await connector.send(
        {
          channel: msg.channel as 'public_reply' | 'dm',
          inReplyToExternalId: body.inReplyToExternalId,
          recipientExternalId: prospect.authorExternalId,
          body: msg.draftBody,
        },
        credsFromEnv(platform),
      );

      if (!result.ok) {
        await db.update(outreachMessages).set({ status: 'failed', sendError: result.error ?? 'send failed', updatedAt: now() }).where(eq(outreachMessages.id, id));
        return NextResponse.json({ error: result.error, code: 'SEND_FAILED' }, { status: 502 });
      }

      const updated = await db
        .update(outreachMessages)
        .set({ status: 'sent', externalMessageId: result.externalMessageId ?? null, sentAt: now(), updatedAt: now() })
        .where(eq(outreachMessages.id, id))
        .returning();
      await db.update(prospects).set({ status: 'contacted', lastContactedAt: now(), updatedAt: now() }).where(eq(prospects.id, prospect.id));
      await db.insert(auditLog).values({ actor: reviewer ?? 'system', action: 'outreach_sent', entityType: 'outreach', entityId: id, detail: `via ${conn?.displayName ?? platform}`, createdAt: now() });
      return NextResponse.json(updated[0], { status: 200 });
    }

    return NextResponse.json({ error: 'Unknown action', code: 'INVALID_ACTION' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error: ' + error, code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

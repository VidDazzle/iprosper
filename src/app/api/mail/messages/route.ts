import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { mailMessages, mailAttachments } from '@/db/schema';
import { and, desc, eq, like, inArray } from 'drizzle-orm';
import { encryptionConfigured } from '@/lib/crypto';
import { triageEmail, generateTagline } from '@/lib/ai';
import { deliverEmail } from '@/lib/mailer';
import {
  mailboxAddress,
  toClientMessage,
  buildEncryptedFields,
  newThreadId,
  StoredMessageRow,
} from '@/lib/mailbox';
import { anyFirstContact, outboundCountTo, prependWelcome } from '@/lib/welcome';
import { pickTagline, appendTagline } from '@/lib/taglines';
import { getPrimaryAccount, meter } from '@/lib/metering';

/**
 * GET  /api/mail/messages?status=&direction=&category=&search=&limit=&offset=
 *   -> inbox list (subjects decrypted, bodies omitted for speed).
 * POST /api/mail/messages
 *   direction "inbound"  -> ingest a received email (AI-triaged, encrypted).
 *   direction "outbound" -> compose + send an email (encrypted + delivered).
 */

export async function GET(request: NextRequest) {
  try {
    if (!encryptionConfigured()) {
      return NextResponse.json(
        { error: 'MAIL_ENCRYPTION_KEY not configured', code: 'NO_ENCRYPTION_KEY' },
        { status: 503 },
      );
    }
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const direction = searchParams.get('direction');
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
    const offset = parseInt(searchParams.get('offset') || '0');

    const conditions = [];
    if (status) conditions.push(eq(mailMessages.status, status));
    if (direction) conditions.push(eq(mailMessages.direction, direction));
    if (category) conditions.push(eq(mailMessages.category, category));
    if (search) conditions.push(like(mailMessages.preview, `%${search}%`));

    const query = db.select().from(mailMessages).$dynamic();
    const rows = (await (conditions.length ? query.where(and(...conditions)) : query)
      .orderBy(desc(mailMessages.createdAt))
      .limit(limit)
      .offset(offset)) as StoredMessageRow[];

    return NextResponse.json(
      { messages: rows.map((r) => toClientMessage(r, false)), mailbox: mailboxAddress() },
      { status: 200 },
    );
  } catch (error) {
    console.error('GET /mail/messages error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!encryptionConfigured()) {
      return NextResponse.json(
        { error: 'MAIL_ENCRYPTION_KEY not configured', code: 'NO_ENCRYPTION_KEY' },
        { status: 503 },
      );
    }
    const body = await request.json();
    const direction = body.direction === 'inbound' ? 'inbound' : 'outbound';
    const nowIso = new Date().toISOString();
    const owner = mailboxAddress();

    const to: string[] = Array.isArray(body.to) ? body.to : body.to ? [body.to] : [];
    const cc: string[] = Array.isArray(body.cc) ? body.cc : body.cc ? [body.cc] : [];
    const subject = typeof body.subject === 'string' ? body.subject : '';
    const messageBody = typeof body.body === 'string' ? body.body : '';

    if (direction === 'outbound' && to.length === 0) {
      return NextResponse.json({ error: 'to is required for outbound mail' }, { status: 400 });
    }
    if (direction === 'inbound' && !body.from) {
      return NextResponse.json({ error: 'from is required for inbound mail' }, { status: 400 });
    }

    // Meter outbound sends (a billable action). Hard-cap: if out of allowance
    // + credits, refuse rather than do paid work for free.
    if (direction === 'outbound') {
      try {
        const account = await getPrimaryAccount();
        const m = await meter(account.id, 'email', 'send');
        if (!m.allowed) {
          return NextResponse.json(
            { error: m.message, code: 'CAP_REACHED', product: 'email', capReached: true },
            { status: 402 },
          );
        }
      } catch (e) {
        console.error('metering error (email send):', e);
      }
    }

    const fromEmail = direction === 'outbound' ? owner : body.from;
    const toEmails = direction === 'outbound' ? to : to.length ? to : [owner];

    // First-contact welcome banner on email #1; a rotating funny sign-off
    // tagline on email #2 onward. skipWelcome / skipTagline opt out per send.
    let outgoingBody = messageBody;
    let welcomeApplied = false;
    let tagline: string | null = null;
    if (direction === 'outbound') {
      if (body.skipWelcome !== true && (await anyFirstContact(toEmails))) {
        outgoingBody = prependWelcome(messageBody);
        welcomeApplied = true;
      } else if (body.skipTagline !== true) {
        const priorCount = await outboundCountTo(toEmails[0]);
        // Prefer a fresh AI-written one-liner; fall back to the fixed rotation.
        tagline = (await generateTagline()) ?? pickTagline(priorCount - 1);
        outgoingBody = appendTagline(messageBody, tagline);
      }
    }

    // AI triage for inbound; outbound is normal priority.
    let priority = 'normal';
    let category: string | null = null;
    if (direction === 'inbound') {
      const triage = await triageEmail(subject, messageBody);
      priority = triage.priority;
      category = triage.category;
    }

    const enc = buildEncryptedFields(subject, outgoingBody);
    const threadId = body.threadId || newThreadId();

    const inserted = await db
      .insert(mailMessages)
      .values({
        threadId,
        direction,
        fromEmail,
        toEmails: toEmails.join(','),
        ccEmails: cc.length ? cc.join(',') : null,
        subjectEncrypted: enc.subjectEncrypted,
        bodyEncrypted: enc.bodyEncrypted,
        preview: enc.preview,
        status: direction === 'inbound' ? 'unread' : 'sent',
        starred: false,
        priority,
        category,
        source: body.source || (direction === 'inbound' ? 'api' : 'manual'),
        createdAt: nowIso,
      })
      .returning();

    let delivery = null;
    if (direction === 'outbound') {
      delivery = await deliverEmail({ from: fromEmail, to: toEmails, cc, subject, body: outgoingBody });
    }

    const row = inserted[0] as unknown as StoredMessageRow;

    // Link any uploaded attachments to this message + thread.
    let attachments: { id: number; filename: string; sizeBytes: number; mimeType: string }[] = [];
    const attachmentIds: number[] = Array.isArray(body.attachmentIds)
      ? body.attachmentIds.filter((n: unknown) => Number.isInteger(n))
      : [];
    if (attachmentIds.length) {
      await db
        .update(mailAttachments)
        .set({ messageId: row.id, threadId })
        .where(inArray(mailAttachments.id, attachmentIds));
      const linked = await db
        .select()
        .from(mailAttachments)
        .where(inArray(mailAttachments.id, attachmentIds));
      attachments = linked.map((a) => ({
        id: a.id,
        filename: a.filename,
        sizeBytes: a.sizeBytes,
        mimeType: a.mimeType,
      }));
    }

    return NextResponse.json(
      { message: { ...toClientMessage(row), attachments }, delivery, welcomeApplied, tagline },
      { status: 201 },
    );
  } catch (error) {
    console.error('POST /mail/messages error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

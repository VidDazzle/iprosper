import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { mailMessages } from '@/db/schema';
import { encryptionConfigured } from '@/lib/crypto';
import { triageEmail } from '@/lib/ai';
import { buildEncryptedFields, newThreadId, mailboxAddress } from '@/lib/mailbox';

/**
 * POST /api/mail/inbound
 *
 * Receive-side integration point. Point your inbound email provider's parse
 * webhook (Mailgun/SendGrid/Postmark/Cloudflare Email Workers, etc.) at this
 * URL; it accepts a normalized payload, AI-triages it, encrypts it, and drops
 * it in the inbox. This is what makes Evolve Mail a real replacement for the
 * receive side of Google email.
 *
 * Auth: set MAIL_INBOUND_SECRET and send it as ?secret= or x-inbound-secret.
 * Payload (normalize at your provider): { from, to?, subject, text|body, html? }
 */
function normalize(body: any): { from: string; to: string[]; subject: string; text: string } | null {
  // Accept a few common provider shapes.
  const from = body.from || body.sender || body.From || '';
  const subject = body.subject || body.Subject || '';
  const text = body.text || body.body || body['body-plain'] || body['stripped-text'] || body.plain || '';
  const rawTo = body.to || body.recipient || body.To || '';
  const to = Array.isArray(rawTo) ? rawTo : String(rawTo).split(',').map((s) => s.trim()).filter(Boolean);
  if (!from) return null;
  return { from: String(from).trim(), to, subject: String(subject), text: String(text) };
}

export async function POST(request: NextRequest) {
  try {
    const secret = process.env.MAIL_INBOUND_SECRET;
    if (secret) {
      const provided =
        new URL(request.url).searchParams.get('secret') || request.headers.get('x-inbound-secret');
      if (provided !== secret) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!encryptionConfigured()) {
      return NextResponse.json({ error: 'MAIL_ENCRYPTION_KEY not configured' }, { status: 503 });
    }

    const raw = await request.json();
    const msg = normalize(raw);
    if (!msg) return NextResponse.json({ error: 'from is required' }, { status: 400 });

    const owner = mailboxAddress();
    const triage = await triageEmail(msg.subject, msg.text);
    const enc = buildEncryptedFields(msg.subject, msg.text);

    const inserted = await db
      .insert(mailMessages)
      .values({
        threadId: raw.threadId || newThreadId(),
        direction: 'inbound',
        fromEmail: msg.from.toLowerCase(),
        toEmails: (msg.to.length ? msg.to : [owner]).join(','),
        ccEmails: null,
        subjectEncrypted: enc.subjectEncrypted,
        bodyEncrypted: enc.bodyEncrypted,
        preview: enc.preview,
        status: 'unread',
        starred: triage.priority === 'high',
        priority: triage.priority,
        category: triage.category,
        source: 'inbound',
        createdAt: new Date().toISOString(),
      })
      .returning();

    return NextResponse.json(
      { received: true, messageId: inserted[0].id, priority: triage.priority, category: triage.category },
      { status: 201 },
    );
  } catch (error) {
    console.error('POST /mail/inbound error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

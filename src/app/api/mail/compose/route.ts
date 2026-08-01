import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { mailMessages } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { tryDecrypt } from '@/lib/crypto';
import { draftEmail, aiConfigured } from '@/lib/ai';
import { StoredMessageRow } from '@/lib/mailbox';

/**
 * POST /api/mail/compose
 * Body: { instruction: "politely decline and propose next month",
 *         replyToId?: number }
 *
 * Returns an AI-written { subject, body } draft. Does NOT send — the client (or
 * voice agent) reviews then POSTs to /api/mail/messages to actually send. This
 * keeps a human/agent confirmation step before anything leaves the mailbox.
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { instruction, replyToId } = body;
    if (!instruction || typeof instruction !== 'string') {
      return NextResponse.json({ error: 'instruction is required' }, { status: 400 });
    }

    let context: { subject?: string; body?: string; fromName?: string } | undefined;
    let threadId: string | undefined;
    let to: string[] | undefined;

    if (replyToId) {
      const rows = await db.select().from(mailMessages).where(eq(mailMessages.id, replyToId)).limit(1);
      const row = rows[0] as StoredMessageRow | undefined;
      if (row) {
        context = {
          subject: tryDecrypt(row.subjectEncrypted, '(no subject)'),
          body: tryDecrypt(row.bodyEncrypted, ''),
          fromName: row.fromEmail,
        };
        threadId = row.threadId;
        to = [row.fromEmail];
      }
    }

    const draft = await draftEmail(instruction, context);

    return NextResponse.json(
      {
        draft,
        suggestedTo: to,
        threadId,
        aiEnabled: aiConfigured(),
        note: aiConfigured()
          ? undefined
          : 'ANTHROPIC_API_KEY not set — returned a basic draft. Add the key for full AI drafting.',
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('POST /mail/compose error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

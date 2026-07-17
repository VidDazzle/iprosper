import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { meetingParticipants, meetingTranscriptLines, meetingArtifacts, mailMessages } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import { findMeeting, renderSummaryReport, fallbackSummary } from '@/lib/meetings';
import { summarizeMeeting, aiConfigured } from '@/lib/ai';
import { encryptionConfigured } from '@/lib/crypto';
import { buildEncryptedFields, newThreadId, mailboxAddress } from '@/lib/mailbox';
import { deliverEmail } from '@/lib/mailer';
import { getPrimaryAccount, meter } from '@/lib/metering';

/**
 * POST /api/meetings/[id]/summary
 * Body: { sendReports?: boolean }
 *
 * Generates an AI summary of the meeting transcript, stores it, and — when
 * sendReports is true — emails the report ONLY to participants who gave express
 * permission (consentReports). This is the "reports to any and all recipients
 * with their express permission" guarantee, enforced server-side.
 */
type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const meeting = await findMeeting((await params).id);
    if (!meeting) return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const sendReports = body.sendReports === true;

    // Meter the AI summary (a billable action) with a hard cap.
    try {
      const account = await getPrimaryAccount();
      const m = await meter(account.id, 'meet', 'summary');
      if (!m.allowed) {
        return NextResponse.json(
          { error: m.message, code: 'CAP_REACHED', product: 'meet', capReached: true },
          { status: 402 },
        );
      }
    } catch (e) {
      console.error('metering error (meet summary):', e);
    }

    const lines = await db
      .select()
      .from(meetingTranscriptLines)
      .where(eq(meetingTranscriptLines.meetingId, meeting.id))
      .orderBy(asc(meetingTranscriptLines.at));

    const transcript = lines.map((l) => `${l.participantName || 'Speaker'}: ${l.text}`).join('\n');

    const summary =
      (transcript ? await summarizeMeeting(meeting.title, transcript) : null) ||
      fallbackSummary(lines.length);

    // Persist the summary artifact.
    await db.insert(meetingArtifacts).values({
      meetingId: meeting.id,
      kind: 'summary',
      content: JSON.stringify(summary),
      createdAt: new Date().toISOString(),
    });

    // Send reports ONLY to those with express consent (and an email).
    const recipientsSent: string[] = [];
    const recipientsSkipped: string[] = [];
    if (sendReports) {
      const participants = await db
        .select()
        .from(meetingParticipants)
        .where(eq(meetingParticipants.meetingId, meeting.id));

      const reportBody = renderSummaryReport(meeting.title, summary);
      const subject = `Meeting notes — ${meeting.title}`;
      const owner = mailboxAddress();

      for (const p of participants) {
        if (!p.email) continue;
        if (!p.consentReports) {
          recipientsSkipped.push(p.email);
          continue;
        }
        // Store (encrypted) + deliver.
        if (encryptionConfigured()) {
          const enc = buildEncryptedFields(subject, reportBody);
          await db.insert(mailMessages).values({
            threadId: newThreadId(),
            direction: 'outbound',
            fromEmail: owner,
            toEmails: p.email,
            ccEmails: null,
            subjectEncrypted: enc.subjectEncrypted,
            bodyEncrypted: enc.bodyEncrypted,
            preview: enc.preview,
            status: 'sent',
            starred: false,
            priority: 'normal',
            category: 'meeting',
            source: 'ai',
            createdAt: new Date().toISOString(),
          });
        }
        await deliverEmail({ from: owner, to: [p.email], subject, body: reportBody });
        recipientsSent.push(p.email);
      }
    }

    return NextResponse.json(
      {
        summary,
        aiEnabled: aiConfigured(),
        transcriptLines: lines.length,
        reports: sendReports ? { sent: recipientsSent, skippedNoConsent: recipientsSkipped } : null,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('POST /meetings/[id]/summary error:', error);
    return NextResponse.json({ error: 'Internal server error', detail: String(error) }, { status: 500 });
  }
}

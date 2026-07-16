import crypto from 'node:crypto';
import { db } from '@/db';
import { meetings } from '@/db/schema';
import { eq } from 'drizzle-orm';
import type { MeetingSummary } from '@/lib/ai';

/** Human-friendly room code like "evolve-4f2k-9x". */
export function makeRoomCode(): string {
  const seg = () => crypto.randomBytes(2).toString('hex');
  return `evolve-${seg()}-${seg().slice(0, 2)}`;
}

/** Resolve a meeting by numeric id or room code. */
export async function findMeeting(idOrCode: string) {
  const asId = parseInt(idOrCode, 10);
  if (!isNaN(asId) && String(asId) === idOrCode) {
    const byId = await db.select().from(meetings).where(eq(meetings.id, asId)).limit(1);
    if (byId[0]) return byId[0];
  }
  const byCode = await db.select().from(meetings).where(eq(meetings.roomCode, idOrCode)).limit(1);
  return byCode[0] || null;
}

/** Render an AI meeting summary into a readable email/report body. */
export function renderSummaryReport(title: string, summary: MeetingSummary): string {
  const lines: string[] = [];
  lines.push(`Summary — ${title}`, '', summary.overview, '');
  if (summary.keyPoints.length) {
    lines.push('Key points:');
    summary.keyPoints.forEach((p) => lines.push(`• ${p}`));
    lines.push('');
  }
  if (summary.decisions.length) {
    lines.push('Decisions:');
    summary.decisions.forEach((d) => lines.push(`• ${d}`));
    lines.push('');
  }
  if (summary.actionItems.length) {
    lines.push('Action items:');
    summary.actionItems.forEach((a) => lines.push(`• [${a.owner}] ${a.task}`));
    lines.push('');
  }
  lines.push('— Prepared by Evolve Meet. You received this because you gave express permission during the meeting.');
  return lines.join('\n');
}

/** Deterministic fallback summary when the AI engine isn't configured. */
export function fallbackSummary(transcriptLineCount: number): MeetingSummary {
  return {
    overview:
      `Transcript captured with ${transcriptLineCount} line(s). Connect an ANTHROPIC_API_KEY ` +
      `for an AI-written overview, decisions, and action items.`,
    keyPoints: [],
    decisions: [],
    actionItems: [],
  };
}

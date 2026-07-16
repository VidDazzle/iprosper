import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { calendarEvents, availabilityRules, mailMessages, mailContacts } from '@/db/schema';
import { and, asc, desc, eq, gte } from 'drizzle-orm';
import { isAuthorizedAgent, agentAuthConfigured, logAgentAction } from '@/lib/voice-auth';
import { findFreeSlots, hasConflict, generateMeetingUrl, FreeSlot } from '@/lib/scheduling';
import { parseSchedulingRequest, draftEmail, triageEmail } from '@/lib/ai';
import { encryptionConfigured, tryDecrypt } from '@/lib/crypto';
import { deliverEmail } from '@/lib/mailer';
import {
  mailboxAddress,
  buildEncryptedFields,
  newThreadId,
  StoredMessageRow,
  toClientMessage,
} from '@/lib/mailbox';
import { anyFirstContact, prependWelcome } from '@/lib/welcome';

/**
 * Unified action endpoint for the autonomous voice agent.
 *
 * The voice agent sends ONE POST here per action, authenticated with the
 * VOICE_AGENT_API_KEY shared secret. Every call is written to the
 * voice_agent_log audit trail. This is the single integration surface a voice
 * platform (Vapi, Retell, Bland, Twilio, Cartesia, etc.) needs to wire up.
 *
 * POST body: { action: string, ...params, callId?, callerNumber? }
 * GET: capability manifest / health check.
 */

const DEFAULT_RULES = [1, 2, 3, 4, 5].map((dayOfWeek) => ({
  dayOfWeek,
  startTime: '09:00',
  endTime: '17:00',
  timezone: 'America/New_York',
  slotMinutes: 30,
  enabled: true,
}));

const ACTIONS = [
  'check_availability',
  'book_meeting',
  'cancel_meeting',
  'reschedule_meeting',
  'list_meetings',
  'next_meeting',
  'read_email',
  'get_email',
  'send_email',
  'draft_email',
  'add_contact',
  'find_contact',
] as const;
type Action = (typeof ACTIONS)[number];

export async function GET() {
  return NextResponse.json({
    service: 'iProsper Autonomous Voice Agent API',
    status: 'online',
    authRequired: true,
    authConfigured: agentAuthConfigured(),
    encryptionConfigured: encryptionConfigured(),
    mailbox: mailboxAddress(),
    actions: ACTIONS,
    usage: 'POST { action, ...params } with Authorization: Bearer <VOICE_AGENT_API_KEY>',
  });
}

export async function POST(request: NextRequest) {
  let action: string | undefined;
  let params: Record<string, unknown> = {};
  try {
    const body = await request.json();
    action = body.action;
    params = body;

    // --- auth gate -------------------------------------------------------
    if (!agentAuthConfigured()) {
      return NextResponse.json(
        { ok: false, error: 'VOICE_AGENT_API_KEY not configured on the server.' },
        { status: 503 },
      );
    }
    if (!isAuthorizedAgent(request)) {
      await logAgentAction({ action: action || 'unknown', params, status: 'rejected' });
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (!action || !ACTIONS.includes(action as Action)) {
      return NextResponse.json(
        { ok: false, error: `Unknown action. Valid actions: ${ACTIONS.join(', ')}` },
        { status: 400 },
      );
    }

    const callId = (body.callId as string) || null;
    const callerNumber = (body.callerNumber as string) || null;

    const result = await dispatch(action as Action, body);

    await logAgentAction({
      action,
      params,
      result,
      status: result.ok ? 'ok' : 'error',
      callId,
      callerNumber,
    });

    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (error) {
    console.error('POST /voice-agent error:', error);
    await logAgentAction({ action: action || 'unknown', params, status: 'error', result: { error: String(error) } });
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// Action handlers
// ---------------------------------------------------------------------------

interface ActionResult {
  ok: boolean;
  // `speech` is a short, ready-to-speak sentence the voice agent can read back.
  speech?: string;
  error?: string;
  [key: string]: unknown;
}

async function getRules() {
  const dbRules = await db.select().from(availabilityRules);
  return dbRules.length ? dbRules : DEFAULT_RULES;
}

async function getEvents() {
  return db
    .select({ startsAt: calendarEvents.startsAt, endsAt: calendarEvents.endsAt, status: calendarEvents.status })
    .from(calendarEvents);
}

function fmtSlot(iso: string, timezone = 'America/New_York'): string {
  return new Date(iso).toLocaleString('en-US', {
    timeZone: timezone,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

async function dispatch(action: Action, body: Record<string, unknown>): Promise<ActionResult> {
  switch (action) {
    case 'check_availability':
      return checkAvailability(body);
    case 'book_meeting':
      return bookMeeting(body);
    case 'cancel_meeting':
      return cancelMeeting(body);
    case 'reschedule_meeting':
      return rescheduleMeeting(body);
    case 'list_meetings':
      return listMeetings(body);
    case 'next_meeting':
      return nextMeeting();
    case 'read_email':
      return readEmail(body);
    case 'get_email':
      return getEmail(body);
    case 'send_email':
      return sendEmail(body);
    case 'draft_email':
      return draftEmailAction(body);
    case 'add_contact':
      return addContact(body);
    case 'find_contact':
      return findContact(body);
    default:
      return { ok: false, error: 'Unhandled action' };
  }
}

async function checkAvailability(body: Record<string, unknown>): Promise<ActionResult> {
  const now = new Date();
  const from = body.from ? new Date(body.from as string) : now;
  const to = body.to ? new Date(body.to as string) : new Date(now.getTime() + 14 * 86400000);
  const slotMinutes = typeof body.durationMinutes === 'number' ? (body.durationMinutes as number) : undefined;

  const slots = findFreeSlots(await getRules(), await getEvents(), from, to, slotMinutes).slice(0, 5);
  if (slots.length === 0) {
    return { ok: true, slots: [], speech: 'I don’t see any open times in that window. Want me to look further out?' };
  }
  const spoken = slots.slice(0, 3).map((s) => fmtSlot(s.start)).join(', ');
  return {
    ok: true,
    slots,
    speech: `I have a few openings: ${spoken}. Which works best?`,
  };
}

async function bookMeeting(body: Record<string, unknown>): Promise<ActionResult> {
  const now = new Date();
  const nowIso = now.toISOString();

  // Two modes: structured (startsAt provided) or natural language (text).
  let title = (body.title as string) || 'Meeting';
  let startsAt = body.startsAt as string | undefined;
  let durationMinutes = (body.durationMinutes as number) || 30;
  let attendees: string[] = Array.isArray(body.attendees) ? (body.attendees as string[]) : [];
  let notes = (body.notes as string) || null;

  if (!startsAt && body.text) {
    const parsed = await parseSchedulingRequest(body.text as string, nowIso);
    title = parsed.title;
    durationMinutes = parsed.durationMinutes;
    attendees = parsed.attendees;
    notes = parsed.notes;
    const from = parsed.preferredDate ? new Date(`${parsed.preferredDate}T00:00:00Z`) : now;
    const searchFrom = from.getTime() < now.getTime() ? now : from;
    const slots = findFreeSlots(
      await getRules(),
      await getEvents(),
      searchFrom,
      new Date(searchFrom.getTime() + 21 * 86400000),
      durationMinutes,
    );
    let chosen: FreeSlot | undefined = slots[0];
    if (parsed.preferredDate) {
      chosen = slots.find((s) => s.start.slice(0, 10) === parsed.preferredDate) || chosen;
    }
    if (!chosen) {
      return { ok: true, booked: false, speech: 'I couldn’t find an open slot that matches. Can you suggest another day?' };
    }
    startsAt = chosen.start;
  }

  if (!startsAt) {
    return { ok: false, error: 'Provide either startsAt or text to book a meeting.' };
  }
  const start = new Date(startsAt);
  const end = new Date(start.getTime() + durationMinutes * 60000);

  const events = await getEvents();
  if (hasConflict(events, start.toISOString(), end.toISOString())) {
    return { ok: true, booked: false, speech: `That time is already taken. Want me to find the nearest opening?` };
  }

  const inserted = await db
    .insert(calendarEvents)
    .values({
      title,
      description: notes,
      startsAt: start.toISOString(),
      endsAt: end.toISOString(),
      timezone: (body.timezone as string) || 'America/New_York',
      status: 'scheduled',
      attendees: attendees.join(',') || null,
      organizerEmail: (body.organizerEmail as string) || null,
      meetingUrl: generateMeetingUrl(),
      source: 'voice_agent',
      agentNotes: (body.callSummary as string) || (body.text as string) || null,
      reminderMinutes: 15,
      reminderSent: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    })
    .returning();

  const ev = inserted[0];
  return {
    ok: true,
    booked: true,
    event: ev,
    speech: `Done — I’ve booked ${title} for ${fmtSlot(ev.startsAt, ev.timezone)}. A calendar invite and meeting link are set.`,
  };
}

async function cancelMeeting(body: Record<string, unknown>): Promise<ActionResult> {
  const id = body.eventId as number | undefined;
  if (!id) return { ok: false, error: 'eventId is required.' };
  const rows = await db.select().from(calendarEvents).where(eq(calendarEvents.id, id)).limit(1);
  if (!rows[0]) return { ok: false, error: 'Meeting not found.' };
  await db
    .update(calendarEvents)
    .set({ status: 'cancelled', updatedAt: new Date().toISOString() })
    .where(eq(calendarEvents.id, id));
  return { ok: true, cancelled: true, speech: `I’ve cancelled ${rows[0].title}.` };
}

async function rescheduleMeeting(body: Record<string, unknown>): Promise<ActionResult> {
  const id = body.eventId as number | undefined;
  const newStart = body.startsAt as string | undefined;
  if (!id || !newStart) return { ok: false, error: 'eventId and startsAt are required.' };
  const rows = await db.select().from(calendarEvents).where(eq(calendarEvents.id, id)).limit(1);
  const existing = rows[0];
  if (!existing) return { ok: false, error: 'Meeting not found.' };

  const durationMs = new Date(existing.endsAt).getTime() - new Date(existing.startsAt).getTime();
  const start = new Date(newStart);
  const end = new Date(start.getTime() + durationMs);

  const events = (await getEvents()).filter((e) => e.startsAt !== existing.startsAt);
  if (hasConflict(events, start.toISOString(), end.toISOString())) {
    return { ok: true, rescheduled: false, speech: 'That new time conflicts with something else. Want another slot?' };
  }
  const updated = await db
    .update(calendarEvents)
    .set({ startsAt: start.toISOString(), endsAt: end.toISOString(), updatedAt: new Date().toISOString() })
    .where(eq(calendarEvents.id, id))
    .returning();
  return {
    ok: true,
    rescheduled: true,
    event: updated[0],
    speech: `Moved ${existing.title} to ${fmtSlot(start.toISOString(), existing.timezone)}.`,
  };
}

async function listMeetings(body: Record<string, unknown>): Promise<ActionResult> {
  const nowIso = new Date().toISOString();
  const limit = Math.min((body.limit as number) || 10, 50);
  const rows = await db
    .select()
    .from(calendarEvents)
    .where(and(gte(calendarEvents.startsAt, nowIso), eq(calendarEvents.status, 'scheduled')))
    .orderBy(asc(calendarEvents.startsAt))
    .limit(limit);
  const speech = rows.length
    ? `You have ${rows.length} upcoming: ${rows.slice(0, 3).map((r) => `${r.title} ${fmtSlot(r.startsAt, r.timezone)}`).join('; ')}.`
    : 'Your calendar is clear.';
  return { ok: true, events: rows, speech };
}

async function nextMeeting(): Promise<ActionResult> {
  const nowIso = new Date().toISOString();
  const rows = await db
    .select()
    .from(calendarEvents)
    .where(and(gte(calendarEvents.startsAt, nowIso), eq(calendarEvents.status, 'scheduled')))
    .orderBy(asc(calendarEvents.startsAt))
    .limit(1);
  if (!rows[0]) return { ok: true, event: null, speech: 'You have nothing else on the calendar.' };
  const ev = rows[0];
  return {
    ok: true,
    event: ev,
    speech: `Your next meeting is ${ev.title} on ${fmtSlot(ev.startsAt, ev.timezone)}.`,
  };
}

async function readEmail(body: Record<string, unknown>): Promise<ActionResult> {
  if (!encryptionConfigured()) return { ok: false, error: 'Mailbox encryption key not configured.' };
  const limit = Math.min((body.limit as number) || 5, 20);
  const rows = (await db
    .select()
    .from(mailMessages)
    .where(and(eq(mailMessages.direction, 'inbound'), eq(mailMessages.status, 'unread')))
    .orderBy(desc(mailMessages.createdAt))
    .limit(limit)) as StoredMessageRow[];

  const messages = rows.map((r) => ({
    id: r.id,
    from: r.fromEmail,
    subject: tryDecrypt(r.subjectEncrypted, '(encrypted)'),
    preview: r.preview,
    priority: r.priority,
    category: r.category,
  }));
  const speech = messages.length
    ? `You have ${messages.length} unread. ${messages
        .slice(0, 3)
        .map((m) => `From ${m.from}: ${m.subject}`)
        .join('. ')}.`
    : 'Your inbox is all caught up.';
  return { ok: true, messages, speech };
}

async function getEmail(body: Record<string, unknown>): Promise<ActionResult> {
  if (!encryptionConfigured()) return { ok: false, error: 'Mailbox encryption key not configured.' };
  const id = body.messageId as number | undefined;
  if (!id) return { ok: false, error: 'messageId is required.' };
  const rows = await db.select().from(mailMessages).where(eq(mailMessages.id, id)).limit(1);
  const row = rows[0] as StoredMessageRow | undefined;
  if (!row) return { ok: false, error: 'Message not found.' };
  if (row.status === 'unread') {
    await db.update(mailMessages).set({ status: 'read' }).where(eq(mailMessages.id, id));
  }
  const msg = toClientMessage(row);
  return { ok: true, message: msg, speech: `From ${msg.from}, subject ${msg.subject}. ${msg.body}` };
}

async function sendEmail(body: Record<string, unknown>): Promise<ActionResult> {
  if (!encryptionConfigured()) return { ok: false, error: 'Mailbox encryption key not configured.' };
  const owner = mailboxAddress();
  const to: string[] = Array.isArray(body.to) ? (body.to as string[]) : body.to ? [body.to as string] : [];
  if (to.length === 0) return { ok: false, error: 'to is required.' };

  let subject = (body.subject as string) || '';
  let bodyText = (body.body as string) || '';

  // If the agent passes an instruction instead of a full body, draft it.
  if (!bodyText && body.instruction) {
    const draft = await draftEmail(body.instruction as string);
    subject = subject || draft.subject;
    bodyText = draft.body;
  }
  if (!bodyText) return { ok: false, error: 'Provide body or instruction.' };

  // First-contact welcome banner for brand-new recipients.
  if (await anyFirstContact(to)) {
    bodyText = prependWelcome(bodyText);
  }

  const enc = buildEncryptedFields(subject, bodyText);
  const nowIso = new Date().toISOString();
  const inserted = await db
    .insert(mailMessages)
    .values({
      threadId: (body.threadId as string) || newThreadId(),
      direction: 'outbound',
      fromEmail: owner,
      toEmails: to.join(','),
      ccEmails: null,
      subjectEncrypted: enc.subjectEncrypted,
      bodyEncrypted: enc.bodyEncrypted,
      preview: enc.preview,
      status: 'sent',
      starred: false,
      priority: 'normal',
      category: null,
      source: 'voice_agent',
      createdAt: nowIso,
    })
    .returning();

  const delivery = await deliverEmail({ from: owner, to, subject, body: bodyText });
  return {
    ok: true,
    sent: true,
    messageId: inserted[0].id,
    delivery,
    speech: delivery.delivered
      ? `Sent to ${to.join(', ')}.`
      : `I’ve drafted and stored the message to ${to.join(', ')}. It’ll go out once the email provider is connected.`,
  };
}

async function draftEmailAction(body: Record<string, unknown>): Promise<ActionResult> {
  const instruction = body.instruction as string | undefined;
  if (!instruction) return { ok: false, error: 'instruction is required.' };
  const draft = await draftEmail(instruction);
  return { ok: true, draft, speech: `Here’s a draft. Subject: ${draft.subject}. ${draft.body}` };
}

async function addContact(body: Record<string, unknown>): Promise<ActionResult> {
  const name = body.name as string | undefined;
  const email = body.email as string | undefined;
  if (!name || !email) return { ok: false, error: 'name and email are required.' };
  const inserted = await db
    .insert(mailContacts)
    .values({
      name,
      email: email.toLowerCase(),
      company: (body.company as string) || null,
      phone: (body.phone as string) || null,
      notes: (body.notes as string) || null,
      createdAt: new Date().toISOString(),
    })
    .returning();
  return { ok: true, contact: inserted[0], speech: `Added ${name} to your contacts.` };
}

async function findContact(body: Record<string, unknown>): Promise<ActionResult> {
  const q = ((body.query as string) || '').toLowerCase();
  if (!q) return { ok: false, error: 'query is required.' };
  const all = await db.select().from(mailContacts).limit(500);
  const matches = all.filter(
    (c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q),
  );
  const speech = matches.length
    ? `Found ${matches[0].name}, ${matches[0].email}.`
    : `I couldn’t find a contact matching ${q}.`;
  return { ok: true, contacts: matches.slice(0, 5), speech };
}

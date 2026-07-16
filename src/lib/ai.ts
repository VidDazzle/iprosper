/**
 * AI engine shared by the calendar and mailbox.
 *
 * When ANTHROPIC_API_KEY is set, this calls the Claude Messages API to parse
 * scheduling requests, triage mail, and draft replies. When it is NOT set,
 * every function degrades to a deterministic heuristic so the whole system
 * keeps working (just less smart) with zero external dependencies.
 *
 * Model is configurable via AI_MODEL (default: claude-sonnet-5).
 */

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = process.env.AI_MODEL || 'claude-sonnet-5';

export function aiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

interface ClaudeCallOptions {
  system: string;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
}

/** Low-level Claude call. Returns the assistant's text, or null on failure. */
async function callClaude(opts: ClaudeCallOptions): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        max_tokens: opts.maxTokens ?? 1024,
        temperature: opts.temperature ?? 0.2,
        system: opts.system,
        messages: [{ role: 'user', content: opts.prompt }],
      }),
    });

    if (!res.ok) {
      console.error('Claude API error:', res.status, await res.text());
      return null;
    }
    const data = await res.json();
    const text = data?.content?.[0]?.text;
    return typeof text === 'string' ? text : null;
  } catch (err) {
    console.error('Claude API call failed:', err);
    return null;
  }
}

/** Extract the first JSON object/array from a model response. */
function extractJson<T>(text: string | null): T | null {
  if (!text) return null;
  const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as T;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Scheduling
// ---------------------------------------------------------------------------

export interface ParsedSchedulingRequest {
  title: string;
  durationMinutes: number;
  attendees: string[];
  preferredDate: string | null; // YYYY-MM-DD or null
  preferredTime: string | null; // HH:MM (24h) or null
  notes: string | null;
}

/**
 * Turn a natural-language request ("book a 30 min demo with john@acme.com next
 * Tuesday afternoon") into structured scheduling fields.
 */
export async function parseSchedulingRequest(
  text: string,
  nowIso: string,
): Promise<ParsedSchedulingRequest> {
  const system = `You are a scheduling parser for a business calendar. Today is ${nowIso}. ` +
    `Extract structured booking details from the user's request. ` +
    `Respond with ONLY a JSON object with keys: title (string), durationMinutes (number, default 30), ` +
    `attendees (array of email strings, [] if none), preferredDate (YYYY-MM-DD or null), ` +
    `preferredTime (HH:MM 24h or null), notes (string or null). Resolve relative dates against today.`;

  const parsed = extractJson<ParsedSchedulingRequest>(
    await callClaude({ system, prompt: text, temperature: 0 }),
  );
  if (parsed && parsed.title) {
    return {
      title: parsed.title,
      durationMinutes: parsed.durationMinutes || 30,
      attendees: Array.isArray(parsed.attendees) ? parsed.attendees : [],
      preferredDate: parsed.preferredDate ?? null,
      preferredTime: parsed.preferredTime ?? null,
      notes: parsed.notes ?? null,
    };
  }
  return heuristicSchedulingParse(text);
}

function heuristicSchedulingParse(text: string): ParsedSchedulingRequest {
  const emails = text.match(/[^\s@]+@[^\s@]+\.[^\s@]+/g) || [];
  const durationMatch = text.match(/(\d+)\s*(min|minute|hour|hr)/i);
  let durationMinutes = 30;
  if (durationMatch) {
    const n = parseInt(durationMatch[1], 10);
    durationMinutes = /hour|hr/i.test(durationMatch[2]) ? n * 60 : n;
  }
  const timeMatch = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i);
  let preferredTime: string | null = null;
  if (timeMatch && timeMatch[3]) {
    let hour = parseInt(timeMatch[1], 10);
    const min = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    if (/pm/i.test(timeMatch[3]) && hour < 12) hour += 12;
    if (/am/i.test(timeMatch[3]) && hour === 12) hour = 0;
    preferredTime = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
  }
  // Title: strip email addresses and common filler.
  const title = text
    .replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, '')
    .replace(/\b(book|schedule|set up|please|can you|a|an|the|with|for)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return {
    title: title ? title.slice(0, 80) : 'Meeting',
    durationMinutes,
    attendees: emails,
    preferredDate: null,
    preferredTime,
    notes: null,
  };
}

// ---------------------------------------------------------------------------
// Mail triage
// ---------------------------------------------------------------------------

export interface MailTriage {
  priority: 'low' | 'normal' | 'high';
  category: string;
  summary: string;
}

/** Classify an inbound email into priority + category + one-line summary. */
export async function triageEmail(subject: string, body: string): Promise<MailTriage> {
  const system =
    `You triage inbound business email. Respond with ONLY a JSON object: ` +
    `{ "priority": "low"|"normal"|"high", "category": one lowercase word ` +
    `(sales, support, billing, personal, spam, scheduling, legal, other), ` +
    `"summary": a one-sentence summary }.`;
  const parsed = extractJson<MailTriage>(
    await callClaude({
      system,
      prompt: `Subject: ${subject}\n\n${body}`,
      temperature: 0,
      maxTokens: 300,
    }),
  );
  if (parsed && parsed.priority && parsed.category) {
    return {
      priority: parsed.priority,
      category: parsed.category.toLowerCase(),
      summary: parsed.summary || subject,
    };
  }
  return heuristicTriage(subject, body);
}

function heuristicTriage(subject: string, body: string): MailTriage {
  const text = `${subject} ${body}`.toLowerCase();
  let priority: MailTriage['priority'] = 'normal';
  if (/urgent|asap|immediately|deadline|invoice due|past due|payment failed/.test(text)) {
    priority = 'high';
  } else if (/newsletter|unsubscribe|no-reply|noreply|promotion|sale ends/.test(text)) {
    priority = 'low';
  }
  let category = 'other';
  if (/invoice|payment|billing|refund|charge/.test(text)) category = 'billing';
  else if (/demo|pricing|quote|interested in|purchase|buy/.test(text)) category = 'sales';
  else if (/help|issue|problem|not working|error|support/.test(text)) category = 'support';
  else if (/meeting|schedule|calendar|availability|book a call/.test(text)) category = 'scheduling';
  else if (/unsubscribe|newsletter|promotion/.test(text)) category = 'spam';
  return { priority, category, summary: subject || body.slice(0, 100) };
}

// ---------------------------------------------------------------------------
// Drafting
// ---------------------------------------------------------------------------

export interface DraftResult {
  subject: string;
  body: string;
}

/**
 * Draft an email. `instruction` is what the sender wants to say; `context` is
 * optional prior thread content the reply should respond to.
 */
export async function draftEmail(
  instruction: string,
  context?: { subject?: string; body?: string; fromName?: string },
): Promise<DraftResult> {
  const system =
    `You are an executive assistant drafting professional business email on behalf ` +
    `of the account owner. Be concise, warm, and clear. Respond with ONLY a JSON ` +
    `object: { "subject": string, "body": string }. Do not include a signature block ` +
    `unless asked; end the body with "Best regards,".`;
  const prompt = context?.body
    ? `You are replying to this email from ${context.fromName || 'the sender'}:\n` +
      `Subject: ${context.subject}\n${context.body}\n\n` +
      `Write a reply that does the following: ${instruction}`
    : `Write a new email that does the following: ${instruction}`;

  const parsed = extractJson<DraftResult>(
    await callClaude({ system, prompt, temperature: 0.4, maxTokens: 800 }),
  );
  if (parsed && parsed.body) {
    return {
      subject: parsed.subject || (context?.subject ? `Re: ${context.subject}` : 'Message'),
      body: parsed.body,
    };
  }
  // Fallback: echo the instruction as a simple note.
  return {
    subject: context?.subject ? `Re: ${context.subject}` : 'Message from the iProsper AI assistant',
    body: `${instruction}\n\nBest regards,`,
  };
}

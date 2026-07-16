import Anthropic from '@anthropic-ai/sdk';

/**
 * AI engine shared by the calendar and mailbox.
 *
 * When ANTHROPIC_API_KEY is set, this calls Claude (via the official
 * @anthropic-ai/sdk) to parse scheduling requests, triage mail, and draft
 * replies — using structured outputs so responses are guaranteed to match the
 * expected JSON schema. When the key is NOT set, every function degrades to a
 * deterministic heuristic so the whole system keeps working (just less smart)
 * with zero external dependencies.
 *
 * Model is configurable via AI_MODEL (default: claude-opus-4-8 — the most
 * capable model). Note: temperature/top_p/top_k are intentionally NOT sent —
 * they are rejected with a 400 on Opus 4.8 / Sonnet 5 / Fable 5.
 */

const DEFAULT_MODEL = process.env.AI_MODEL || 'claude-opus-4-8';

// One shared client. The SDK reads ANTHROPIC_API_KEY from the environment.
let client: Anthropic | null = null;
function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!client) client = new Anthropic();
  return client;
}

export function aiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/**
 * Run a structured-output call. Returns the parsed object typed as T, or null
 * on any failure (no key, API error, refusal, unparseable) so callers can fall
 * back to heuristics.
 */
async function structuredCall<T>(
  system: string,
  prompt: string,
  schema: Record<string, unknown>,
  maxTokens = 1024,
): Promise<T | null> {
  const anthropic = getClient();
  if (!anthropic) return null;
  try {
    const res = await anthropic.messages.parse({
      model: DEFAULT_MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: prompt }],
      output_config: { format: { type: 'json_schema', schema } },
    });
    if (res.stop_reason === 'refusal') return null;
    return (res.parsed_output as T) ?? null;
  } catch (err) {
    console.error('Claude structured call failed:', err);
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
  const system =
    `You are a scheduling parser for a business calendar. Today is ${nowIso}. ` +
    `Extract structured booking details from the user's request. Resolve relative ` +
    `dates ("next Tuesday", "tomorrow") against today. Use null when a field is not specified.`;

  const schema = {
    type: 'object',
    additionalProperties: false,
    properties: {
      title: { type: 'string' },
      durationMinutes: { type: 'integer' },
      attendees: { type: 'array', items: { type: 'string' } },
      preferredDate: { type: ['string', 'null'] },
      preferredTime: { type: ['string', 'null'] },
      notes: { type: ['string', 'null'] },
    },
    required: ['title', 'durationMinutes', 'attendees', 'preferredDate', 'preferredTime', 'notes'],
  };

  const parsed = await structuredCall<ParsedSchedulingRequest>(system, text, schema);
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
    `You triage inbound business email. Classify priority (low/normal/high), a single ` +
    `lowercase category word (sales, support, billing, personal, spam, scheduling, legal, other), ` +
    `and a one-sentence summary.`;
  const schema = {
    type: 'object',
    additionalProperties: false,
    properties: {
      priority: { type: 'string', enum: ['low', 'normal', 'high'] },
      category: { type: 'string' },
      summary: { type: 'string' },
    },
    required: ['priority', 'category', 'summary'],
  };
  const parsed = await structuredCall<MailTriage>(
    system,
    `Subject: ${subject}\n\n${body}`,
    schema,
    400,
  );
  if (parsed && parsed.priority && parsed.category) {
    return { priority: parsed.priority, category: parsed.category.toLowerCase(), summary: parsed.summary || subject };
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
    `of the account owner. Be concise, warm, and clear. End the body with "Best regards,". ` +
    `Do not add a signature block unless asked.`;
  const prompt = context?.body
    ? `You are replying to this email from ${context.fromName || 'the sender'}:\n` +
      `Subject: ${context.subject}\n${context.body}\n\n` +
      `Write a reply that does the following: ${instruction}`
    : `Write a new email that does the following: ${instruction}`;

  const schema = {
    type: 'object',
    additionalProperties: false,
    properties: {
      subject: { type: 'string' },
      body: { type: 'string' },
    },
    required: ['subject', 'body'],
  };

  const parsed = await structuredCall<DraftResult>(system, prompt, schema, 800);
  if (parsed && parsed.body) {
    return {
      subject: parsed.subject || (context?.subject ? `Re: ${context.subject}` : 'Message'),
      body: parsed.body,
    };
  }
  return {
    subject: context?.subject ? `Re: ${context.subject}` : 'Message from the iProsper AI assistant',
    body: `${instruction}\n\nBest regards,`,
  };
}

// ---------------------------------------------------------------------------
// Sign-off taglines
// ---------------------------------------------------------------------------

// Angles rotated into the prompt so each call produces a distinctly different
// line (temperature isn't available on current models, so we vary the input).
const TAGLINE_ANGLES = [
  'absurd flex about how encrypted / private it is',
  'deadpan roast of clunky old email providers',
  'over-the-top humblebrag about the AI doing the boring work for you',
  'self-aware joke about Evolve being extra / dramatic',
  'inbox-zero / productivity fantasy taken too far',
  'ship-it startup bravado',
  'a wink about your data being locked away where nobody can touch it',
  'unhinged confidence with a wholesome "have a great day" undertone',
];

/**
 * Generate a fresh, HEAVILY sarcastic one-line email sign-off in Evolve's
 * voice, tuned to make Gen Z, millennials, and techies actually laugh. Returns
 * null when the AI is unavailable so the caller can fall back to the fixed list.
 */
export async function generateTagline(avoid: string[] = []): Promise<string | null> {
  const angle = TAGLINE_ANGLES[Math.floor(Math.random() * TAGLINE_ANGLES.length)];
  const seed = Math.random().toString(36).slice(2, 8);

  const system =
    `You write ONE witty, HEAVILY SARCASTIC email sign-off line for "Evolve" — a ` +
    `secure, AI-run email + AI voice-agent company. The line prints at the bottom ` +
    `of a business email; the goal is to make the reader laugh and start their day ` +
    `right. Land it with Gen Z, millennials, AND techies: clever, confident, dry, ` +
    `sarcastic, culturally fluent — go big on the sarcasm — but never mean-spirited, ` +
    `offensive, or cringe.\n\n` +
    `HARD PRIVACY RULE (never break): Evolve NEVER reads, scans, monitors, peeks at, ` +
    `analyzes, or "reads the docs/emails" of the customer. Never imply we can see, ` +
    `access, or snoop on their messages, data, or activity — that destroys trust. ` +
    `When you joke about security/privacy, make it clear THEIR stuff is so private ` +
    `and locked down that even WE can't see it. Do not reference reading, watching, ` +
    `tracking, or surveilling the user in any way.\n\n` +
    `Format: ONE line, under ~100 characters, no emojis, no hashtags, no surrounding ` +
    `quotation marks, safe for work. Vary structure — never formulaic.`;

  const prompt =
    `Write one new, savagely funny Evolve sign-off tagline with this angle: ${angle}. ` +
    `Creative seed: ${seed}. Make it fresh, sarcastic, and unlike anything generic. ` +
    `Remember: never imply Evolve reads or sees the customer's email/data. ` +
    (avoid.length ? `Do NOT reuse or closely echo any of these: ${avoid.join(' | ')}.` : '');

  const schema = {
    type: 'object',
    additionalProperties: false,
    properties: { tagline: { type: 'string' } },
    required: ['tagline'],
  };

  const parsed = await structuredCall<{ tagline: string }>(system, prompt, schema, 120);
  const line = parsed?.tagline?.trim().replace(/^["'“”]|["'“”]$/g, '').trim();
  if (line && line.length <= 160) return line;
  return null;
}

// ---------------------------------------------------------------------------
// Birthday surprise
// ---------------------------------------------------------------------------

export interface BirthdayEmail {
  subject: string;
  body: string;
}

/**
 * Write a funny, warm, heavily-sarcastic birthday email in Evolve's voice.
 * `surprise` is the actual offer/gift line to include. Returns null when the
 * AI is unavailable so the caller can fall back to a template.
 */
export async function generateBirthdayMessage(
  name: string,
  surprise: string,
): Promise<BirthdayEmail | null> {
  const seed = Math.random().toString(36).slice(2, 8);
  const system =
    `You write a short, funny, HEAVILY SARCASTIC but genuinely warm birthday email ` +
    `from "Evolve" (a secure, AI-run email + voice-agent company) to a customer. ` +
    `Goal: make them laugh and feel special. Voice: dry, clever, celebratory, a ` +
    `little unhinged in a fun way, resonates with Gen Z / millennials / techies. ` +
    `HARD PRIVACY RULE: never imply Evolve reads, scans, tracks, or sees the ` +
    `customer's email/data/activity — no "we noticed", "we saw", "our AI watches" ` +
    `framing. You know their birthday only because they TOLD us at signup; you may ` +
    `nod to that. Include the surprise/offer provided, verbatim in spirit. ` +
    `3-6 short sentences. No emojis, no hashtags. Sign off as "— The Evolve crew".`;
  const prompt =
    `Write a birthday email to ${name || 'our favorite human'}. ` +
    `The surprise to include: "${surprise}". Creative seed: ${seed}.`;

  const schema = {
    type: 'object',
    additionalProperties: false,
    properties: { subject: { type: 'string' }, body: { type: 'string' } },
    required: ['subject', 'body'],
  };

  const parsed = await structuredCall<BirthdayEmail>(system, prompt, schema, 500);
  if (parsed && parsed.body) {
    return { subject: parsed.subject || 'Happy Birthday from Evolve 🎉', body: parsed.body };
  }
  return null;
}

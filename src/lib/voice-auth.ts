import { NextRequest } from 'next/server';
import { db } from '@/db';
import { voiceAgentLog } from '@/db/schema';

/**
 * Shared-secret auth for machine callers (the voice agent, cron, integrations).
 *
 * The voice agent must send its token as `Authorization: Bearer <token>` or an
 * `x-agent-key` header. The expected value is VOICE_AGENT_API_KEY. This gates
 * every autonomous action so a random internet request can't book meetings or
 * read mail.
 */
export function isAuthorizedAgent(request: NextRequest): boolean {
  const expected = process.env.VOICE_AGENT_API_KEY;
  // If no key is configured we fail closed for write actions.
  if (!expected) return false;

  const auth = request.headers.get('authorization');
  const bearer = auth?.toLowerCase().startsWith('bearer ')
    ? auth.slice(7).trim()
    : null;
  const headerKey = request.headers.get('x-agent-key');
  const provided = bearer || headerKey;
  if (!provided) return false;

  // Constant-time compare to avoid leaking length/timing.
  return timingSafeEqual(provided, expected);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/** True when the agent key is configured at all. */
export function agentAuthConfigured(): boolean {
  return Boolean(process.env.VOICE_AGENT_API_KEY);
}

/** Append an entry to the autonomous-action audit log. Never throws. */
export async function logAgentAction(entry: {
  action: string;
  params?: unknown;
  result?: unknown;
  status?: 'ok' | 'error' | 'rejected';
  callId?: string | null;
  callerNumber?: string | null;
}): Promise<void> {
  try {
    await db.insert(voiceAgentLog).values({
      action: entry.action,
      params: entry.params ? JSON.stringify(entry.params) : null,
      result: entry.result ? JSON.stringify(entry.result) : null,
      status: entry.status || 'ok',
      callId: entry.callId || null,
      callerNumber: entry.callerNumber || null,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Failed to write voice_agent_log entry:', err);
  }
}

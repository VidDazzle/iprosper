/**
 * Multi-channel notifier — "we'll remind you by text, email, notification, or
 * voice; you choose which." One entry point, four adapters, each degrading to a
 * queued/stored result when its provider isn't configured (matching how the
 * mailer, storage, and payments libs behave).
 */

import { deliverEmail } from '@/lib/mailer';
import { mailboxAddress } from '@/lib/mailbox';
import { db } from '@/db';
import { voiceAgentLog } from '@/db/schema';

export type NotifyChannel = 'email' | 'sms' | 'push' | 'voice';

export interface NotifyInput {
  channel: NotifyChannel;
  title: string;
  body: string;
  to?: string | null; // email address (email channel)
  phone?: string | null; // E.164 (sms / voice)
  pushEndpoint?: string | null; // JSON web-push subscription (push)
}

export interface NotifyResult {
  channel: NotifyChannel;
  delivered: boolean;
  queued: boolean;
  provider: string;
  note?: string;
}

export async function notify(input: NotifyInput): Promise<NotifyResult> {
  switch (input.channel) {
    case 'email':
      return viaEmail(input);
    case 'sms':
      return viaSms(input);
    case 'push':
      return viaPush(input);
    case 'voice':
      return viaVoice(input);
    default:
      return { channel: input.channel, delivered: false, queued: true, provider: 'none', note: 'Unknown channel' };
  }
}

async function viaEmail(input: NotifyInput): Promise<NotifyResult> {
  const to = input.to;
  if (!to) return { channel: 'email', delivered: false, queued: true, provider: 'none', note: 'No email on file' };
  const r = await deliverEmail({ from: mailboxAddress(), to: [to], subject: input.title, body: input.body });
  return { channel: 'email', delivered: r.delivered, queued: r.queued, provider: r.provider, note: r.note };
}

async function viaSms(input: NotifyInput): Promise<NotifyResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!sid || !token || !from) {
    return { channel: 'sms', delivered: false, queued: true, provider: 'none', note: 'Set TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM_NUMBER to send texts.' };
  }
  if (!input.phone) return { channel: 'sms', delivered: false, queued: true, provider: 'twilio', note: 'No phone on file' };
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: input.phone, From: from, Body: `${input.title}\n${input.body}` }),
    });
    if (!res.ok) {
      const t = await res.text();
      console.error('Twilio error:', res.status, t);
      return { channel: 'sms', delivered: false, queued: true, provider: 'twilio', note: `Provider error: ${res.status}` };
    }
    return { channel: 'sms', delivered: true, queued: false, provider: 'twilio' };
  } catch (err) {
    console.error('SMS send failed:', err);
    return { channel: 'sms', delivered: false, queued: true, provider: 'twilio', note: 'Send failed; queued' };
  }
}

async function viaPush(input: NotifyInput): Promise<NotifyResult> {
  // Web Push requires VAPID keys + a stored subscription. Wiring the actual
  // send (web-push signing) is a Codex step; we surface a clear queued state.
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return { channel: 'push', delivered: false, queued: true, provider: 'none', note: 'Set VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY and register a push subscription to enable notifications.' };
  }
  if (!input.pushEndpoint) {
    return { channel: 'push', delivered: false, queued: true, provider: 'web-push', note: 'No push subscription registered on this device yet.' };
  }
  return { channel: 'push', delivered: false, queued: true, provider: 'web-push', note: 'VAPID configured — connect the web-push sender to deliver.' };
}

async function viaVoice(input: NotifyInput): Promise<NotifyResult> {
  // The autonomous voice agent (Vapi / Retell / Bland / Twilio) places the
  // call. We record the intent to the agent log; the platform picks it up.
  try {
    await db.insert(voiceAgentLog).values({
      action: 'voice_reminder',
      params: JSON.stringify({ phone: input.phone, title: input.title }),
      result: JSON.stringify({ body: input.body }),
      status: process.env.VOICE_AGENT_API_KEY ? 'ok' : 'queued',
      callerNumber: input.phone || null,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('voice reminder log failed:', err);
  }
  const configured = Boolean(process.env.VOICE_AGENT_API_KEY);
  return {
    channel: 'voice',
    delivered: false,
    queued: true,
    provider: configured ? 'voice-agent' : 'none',
    note: configured ? 'Handed to the voice agent to place the call.' : 'Set VOICE_AGENT_API_KEY to have the agent call.',
  };
}

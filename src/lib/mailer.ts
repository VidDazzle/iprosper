/**
 * Outbound email delivery.
 *
 * Actually putting mail on the wire requires an SMTP/API provider. To keep the
 * app dependency-free, this uses Resend's HTTP API when RESEND_API_KEY is set.
 * Without it, messages are still stored (status "sent") and reported as queued
 * so nothing breaks — you just plug in a provider when you're ready to send for
 * real. Swap this single function for SendGrid/Postmark/SES as needed.
 */

export interface DeliverInput {
  from: string;
  to: string[];
  cc?: string[];
  subject: string;
  body: string;
}

export interface DeliverResult {
  delivered: boolean;
  queued: boolean;
  providerId?: string;
  provider: string;
  note?: string;
}

export async function deliverEmail(input: DeliverInput): Promise<DeliverResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return {
      delivered: false,
      queued: true,
      provider: 'none',
      note: 'Stored locally. Set RESEND_API_KEY (or wire another SMTP provider) to send for real.',
    };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: input.from,
        to: input.to,
        cc: input.cc,
        subject: input.subject,
        text: input.body,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error('Resend delivery error:', res.status, text);
      return { delivered: false, queued: true, provider: 'resend', note: `Provider error: ${res.status}` };
    }
    const data = await res.json();
    return { delivered: true, queued: false, provider: 'resend', providerId: data?.id };
  } catch (err) {
    console.error('deliverEmail failed:', err);
    return { delivered: false, queued: true, provider: 'resend', note: 'Network error contacting provider.' };
  }
}

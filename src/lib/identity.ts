/**
 * Identity verification adapter for Evolve Together.
 *
 * Uploading a photo requires the owner to pass a document + selfie (face-match)
 * check. That check is run by a dedicated KYC provider — Stripe Identity by
 * default (Persona / Onfido / Veriff are drop-in). We NEVER receive or store
 * the driver's-license image or the biometric template; the provider does the
 * matching and returns only a pass/fail, which is all we persist.
 *
 * Note: OpenAI does not offer identity or biometric verification, so this is
 * wired to a real KYC provider instead. With no provider key set, a clearly
 * labeled sandbox lets the flow be exercised end-to-end in development.
 */

export interface VerificationSession {
  provider: string;
  sessionId: string;
  url: string | null; // where the person completes the check (provider-hosted)
  clientSecret?: string | null;
  status: 'pending' | 'verified' | 'failed';
  sandbox: boolean;
  note?: string;
}

export function identityConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY || process.env.PERSONA_API_KEY || process.env.ONFIDO_API_TOKEN);
}

/**
 * Create a provider-hosted verification session (document + selfie). Returns a
 * URL/client secret the UI sends the person to. On success the provider calls
 * our webhook, which flips status to 'verified'.
 */
export async function startVerification(profileId: number, returnUrl: string): Promise<VerificationSession> {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (stripeKey) {
    try {
      const res = await fetch('https://api.stripe.com/v1/identity/verification_sessions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${stripeKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          type: 'document',
          'metadata[profileId]': String(profileId),
          'options[document][require_matching_selfie]': 'true',
          return_url: returnUrl,
        }),
      });
      if (res.ok) {
        const s = await res.json();
        return {
          provider: 'stripe_identity',
          sessionId: s.id,
          url: s.url || null,
          clientSecret: s.client_secret || null,
          status: 'pending',
          sandbox: false,
        };
      }
      console.error('Stripe Identity error:', res.status, await res.text());
    } catch (err) {
      console.error('startVerification failed:', err);
    }
  }
  // Sandbox: no provider configured. The flow works; verification is simulated
  // via POST /api/together/identity/webhook { sandbox:true }.
  return {
    provider: 'none',
    sessionId: `sandbox_${profileId}_${Date.now()}`,
    url: null,
    status: 'pending',
    sandbox: true,
    note: 'Sandbox mode — set STRIPE_SECRET_KEY (Stripe Identity) or another KYC provider to require a real driver’s-license + face match.',
  };
}

/**
 * Verify a Stripe webhook signature (reused pattern from checkout). Returns the
 * parsed event or null. When no signing secret is set, returns the parsed body
 * (sandbox), so the flow is exercisable without a provider.
 */
export async function parseIdentityWebhook(rawBody: string, signature: string | null): Promise<Record<string, unknown> | null> {
  const secret = process.env.STRIPE_IDENTITY_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    try { return JSON.parse(rawBody); } catch { return null; }
  }
  if (!signature) return null;
  try {
    const crypto = await import('node:crypto');
    const parts = Object.fromEntries(signature.split(',').map((kv) => kv.split('=')));
    const signedPayload = `${parts.t}.${rawBody}`;
    const expected = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
    if (parts.v1 && crypto.timingSafeEqual(Buffer.from(parts.v1), Buffer.from(expected))) {
      return JSON.parse(rawBody);
    }
    console.error('Identity webhook signature mismatch');
    return null;
  } catch (err) {
    console.error('parseIdentityWebhook failed:', err);
    return null;
  }
}

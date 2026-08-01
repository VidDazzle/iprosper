import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateProfile } from '@/lib/life';
import { authorizeUrl, providerConfigured, providerLabel, type Provider } from '@/lib/calendar-connect';

/** Build the current public origin (honoring the reverse proxy). */
function originOf(request: NextRequest): string {
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  if (host) return `${proto}://${host}`;
  return new URL(request.url).origin;
}

/**
 * GET /api/orbit/calendar/connect?provider=google|microsoft&email=
 * Returns { url } to redirect the browser to the provider's consent screen, or
 * 501 { error: 'not_configured' } when the OAuth app isn't set up yet.
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const provider = url.searchParams.get('provider') as Provider | null;
    if (provider !== 'google' && provider !== 'microsoft') {
      return NextResponse.json({ error: 'provider must be google or microsoft' }, { status: 400 });
    }
    if (!providerConfigured(provider)) {
      return NextResponse.json(
        { error: 'not_configured', message: `${providerLabel(provider)} isn't set up yet. Add its OAuth credentials to enable one-tap connect.` },
        { status: 501 },
      );
    }
    const me = await getOrCreateProfile(url.searchParams.get('email'));
    const authUrl = authorizeUrl(provider, me.id, originOf(request));
    return NextResponse.json({ url: authUrl }, { status: 200 });
  } catch (err) {
    console.error('GET /orbit/calendar/connect error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

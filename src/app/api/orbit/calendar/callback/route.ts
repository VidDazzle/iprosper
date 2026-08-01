import { NextRequest, NextResponse } from 'next/server';
import { decodeState, exchangeCode, saveConnection, providerLabel } from '@/lib/calendar-connect';

function originOf(request: NextRequest): string {
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  if (host) return `${proto}://${host}`;
  return new URL(request.url).origin;
}

/**
 * GET /api/orbit/calendar/callback — OAuth redirect target. Exchanges the code,
 * stores the (sealed) tokens, and bounces back to /orbit with a status flag.
 */
export async function GET(request: NextRequest) {
  const origin = originOf(request);
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const stateRaw = url.searchParams.get('state');
  const oauthError = url.searchParams.get('error');

  const back = (params: string) => NextResponse.redirect(`${origin}/orbit?${params}`);

  if (oauthError) return back(`calendar=denied`);
  if (!code || !stateRaw) return back(`calendar=error`);

  const state = decodeState(stateRaw);
  if (!state) return back(`calendar=error`);

  try {
    const tokens = await exchangeCode(state.provider, code, origin);
    await saveConnection(state.provider, state.profileId, tokens);
    return back(`calendar=connected&provider=${encodeURIComponent(providerLabel(state.provider))}`);
  } catch (err) {
    console.error('OAuth callback failed:', err);
    return back(`calendar=error`);
  }
}

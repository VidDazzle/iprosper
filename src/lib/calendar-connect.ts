/**
 * External calendar connect — link a person's EXISTING Google Calendar or
 * Microsoft Outlook/365 calendar to Orbit.
 *
 * Why: Orbit should plan around the life you already keep elsewhere. Once a
 * calendar is linked, its events count as "busy" for availability (so Orbit,
 * Together date-planning, and the concierge never suggest a time you're taken),
 * and — if you opt in — Orbit events are pushed back out so your existing
 * calendar stays the single source of truth.
 *
 * House pattern: every network call is gated on the provider's OAuth env vars.
 * With no keys configured, connecting returns a clear "not configured" state and
 * the rest of the app keeps working — nothing here is required to run Orbit.
 *
 * Privacy: OAuth tokens are stored SEALED (AES-GCM via MAIL_ENCRYPTION_KEY) when
 * encryption is configured; we keep only the tokens + the account email, never a
 * copy of the remote calendar's contents. Codex: set the OAuth creds + a real
 * encryption key in production, and register the callback URL with each provider.
 */

import { db } from '@/db';
import { calendarConnections } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { encrypt, decrypt, encryptionConfigured } from '@/lib/crypto';
import type { BusyEvent } from '@/lib/scheduling';

export type Provider = 'google' | 'microsoft';
export type CalendarConnection = typeof calendarConnections.$inferSelect;

const CALLBACK_PATH = '/api/orbit/calendar/callback';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export function providerConfigured(provider: Provider): boolean {
  if (provider === 'google') return Boolean(process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET);
  return Boolean(process.env.MICROSOFT_OAUTH_CLIENT_ID && process.env.MICROSOFT_OAUTH_CLIENT_SECRET);
}
export function anyProviderConfigured(): boolean {
  return providerConfigured('google') || providerConfigured('microsoft');
}
export function providerLabel(provider: Provider): string {
  return provider === 'google' ? 'Google Calendar' : 'Microsoft Outlook';
}
function msTenant(): string {
  return process.env.MICROSOFT_OAUTH_TENANT || 'common';
}

const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'openid',
].join(' ');
const MICROSOFT_SCOPES = ['offline_access', 'Calendars.ReadWrite', 'User.Read', 'openid', 'email', 'profile'].join(' ');

// ---------------------------------------------------------------------------
// Token sealing (at rest)
// ---------------------------------------------------------------------------

function seal(token: string | null | undefined): string | null {
  if (!token) return null;
  if (!encryptionConfigured()) return token; // dev: plaintext, clearly documented
  return encrypt(token);
}
function open(sealed: string | null | undefined): string | null {
  if (!sealed) return null;
  // Envelopes are JSON with {iv,tag,data}; plaintext tokens are not.
  try {
    const p = JSON.parse(sealed);
    if (p && p.iv && p.tag && p.data) return decrypt(sealed);
  } catch { /* not an envelope — plaintext */ }
  return sealed;
}

// ---------------------------------------------------------------------------
// OAuth: authorize URL + code exchange + refresh
// ---------------------------------------------------------------------------

export function callbackUrl(origin: string): string {
  return `${origin.replace(/\/$/, '')}${CALLBACK_PATH}`;
}

/** Base64url state carrying provider + profile so the callback knows the context. */
export function encodeState(provider: Provider, profileId: number): string {
  return Buffer.from(JSON.stringify({ provider, profileId, n: Math.random().toString(36).slice(2) })).toString('base64url');
}
export function decodeState(state: string): { provider: Provider; profileId: number } | null {
  try {
    const o = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
    if ((o.provider === 'google' || o.provider === 'microsoft') && typeof o.profileId === 'number') {
      return { provider: o.provider, profileId: o.profileId };
    }
  } catch { /* bad state */ }
  return null;
}

export function authorizeUrl(provider: Provider, profileId: number, origin: string): string | null {
  if (!providerConfigured(provider)) return null;
  const redirectUri = callbackUrl(origin);
  const state = encodeState(provider, profileId);
  if (provider === 'google') {
    const p = new URLSearchParams({
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: GOOGLE_SCOPES,
      access_type: 'offline',
      include_granted_scopes: 'true',
      prompt: 'consent',
      state,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${p.toString()}`;
  }
  const p = new URLSearchParams({
    client_id: process.env.MICROSOFT_OAUTH_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: 'code',
    response_mode: 'query',
    scope: MICROSOFT_SCOPES,
    state,
  });
  return `https://login.microsoftonline.com/${msTenant()}/oauth2/v2.0/authorize?${p.toString()}`;
}

interface TokenSet {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null; // ISO
  scope: string | null;
}

async function exchange(provider: Provider, params: Record<string, string>): Promise<TokenSet> {
  const url =
    provider === 'google'
      ? 'https://oauth2.googleapis.com/token'
      : `https://login.microsoftonline.com/${msTenant()}/oauth2/v2.0/token`;
  const clientId = provider === 'google' ? process.env.GOOGLE_OAUTH_CLIENT_ID! : process.env.MICROSOFT_OAUTH_CLIENT_ID!;
  const clientSecret = provider === 'google' ? process.env.GOOGLE_OAUTH_CLIENT_SECRET! : process.env.MICROSOFT_OAUTH_CLIENT_SECRET!;
  const body = new URLSearchParams({ client_id: clientId, client_secret: clientSecret, ...params });
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString() });
  if (!res.ok) throw new Error(`${provider} token exchange failed: ${res.status} ${await res.text()}`);
  const d = await res.json();
  return {
    accessToken: d.access_token,
    refreshToken: d.refresh_token ?? null,
    expiresAt: d.expires_in ? new Date(Date.now() + (Number(d.expires_in) - 60) * 1000).toISOString() : null,
    scope: d.scope ?? null,
  };
}

export async function exchangeCode(provider: Provider, code: string, origin: string): Promise<TokenSet> {
  return exchange(provider, { code, redirect_uri: callbackUrl(origin), grant_type: 'authorization_code' });
}

async function accountEmail(provider: Provider, accessToken: string): Promise<string | null> {
  try {
    if (provider === 'google') {
      const r = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', { headers: { Authorization: `Bearer ${accessToken}` } });
      if (r.ok) return (await r.json()).email ?? null;
    } else {
      const r = await fetch('https://graph.microsoft.com/v1.0/me', { headers: { Authorization: `Bearer ${accessToken}` } });
      if (r.ok) { const d = await r.json(); return d.mail || d.userPrincipalName || null; }
    }
  } catch (err) { console.error('accountEmail lookup failed:', err); }
  return null;
}

/**
 * Persist a freshly-authorized connection (called from the OAuth callback).
 * Re-linking the same provider+account updates the existing row.
 */
export async function saveConnection(provider: Provider, profileId: number, tokens: TokenSet): Promise<CalendarConnection> {
  const email = await accountEmail(provider, tokens.accessToken);
  const now = new Date().toISOString();
  const existing = email
    ? (await db.select().from(calendarConnections).where(and(eq(calendarConnections.profileId, profileId), eq(calendarConnections.provider, provider), eq(calendarConnections.accountEmail, email))).limit(1))[0]
    : undefined;

  const values = {
    accountEmail: email,
    accessToken: seal(tokens.accessToken),
    // Keep an existing refresh token if the provider didn't send a new one.
    refreshToken: seal(tokens.refreshToken) ?? existing?.refreshToken ?? null,
    expiresAt: tokens.expiresAt,
    scope: tokens.scope,
    status: 'active' as const,
    lastError: null,
    updatedAt: now,
  };

  if (existing) {
    const rows = await db.update(calendarConnections).set(values).where(eq(calendarConnections.id, existing.id)).returning();
    return rows[0];
  }
  const rows = await db.insert(calendarConnections).values({
    profileId, provider, calendarId: 'primary', syncInbound: true, syncOutbound: false, createdAt: now, ...values,
  }).returning();
  return rows[0];
}

/** Return a valid access token, refreshing (and persisting) if it has expired. */
async function validAccessToken(conn: CalendarConnection): Promise<string | null> {
  const current = open(conn.accessToken);
  const notExpired = conn.expiresAt && new Date(conn.expiresAt).getTime() > Date.now();
  if (current && notExpired) return current;

  const refresh = open(conn.refreshToken);
  if (!refresh || !providerConfigured(conn.provider as Provider)) return current; // best effort
  try {
    const fresh = await exchange(conn.provider as Provider, { refresh_token: refresh, grant_type: 'refresh_token' });
    await db.update(calendarConnections).set({
      accessToken: seal(fresh.accessToken),
      refreshToken: seal(fresh.refreshToken) ?? conn.refreshToken,
      expiresAt: fresh.expiresAt,
      status: 'active', lastError: null, updatedAt: new Date().toISOString(),
    }).where(eq(calendarConnections.id, conn.id));
    return fresh.accessToken;
  } catch (err) {
    console.error('token refresh failed:', err);
    await db.update(calendarConnections).set({ status: 'error', lastError: String(err).slice(0, 300), updatedAt: new Date().toISOString() }).where(eq(calendarConnections.id, conn.id));
    return current;
  }
}

// ---------------------------------------------------------------------------
// Import busy blocks + push events
// ---------------------------------------------------------------------------

/** Pull busy intervals from one connected calendar over [from, to]. */
export async function importBusy(conn: CalendarConnection, from: Date, to: Date): Promise<BusyEvent[]> {
  const token = await validAccessToken(conn);
  if (!token) return [];
  try {
    if (conn.provider === 'google') {
      const res = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeMin: from.toISOString(), timeMax: to.toISOString(), items: [{ id: conn.calendarId || 'primary' }] }),
      });
      if (!res.ok) throw new Error(`google freeBusy ${res.status}`);
      const d = await res.json();
      const cal = d.calendars?.[conn.calendarId || 'primary'];
      return (cal?.busy || []).map((b: { start: string; end: string }) => ({ startsAt: new Date(b.start).toISOString(), endsAt: new Date(b.end).toISOString(), status: 'confirmed' }));
    }
    // Microsoft Graph calendarView
    const p = new URLSearchParams({ startDateTime: from.toISOString(), endDateTime: to.toISOString(), $select: 'start,end,showAs,isCancelled', $top: '200' });
    const res = await fetch(`https://graph.microsoft.com/v1.0/me/calendarView?${p.toString()}`, {
      headers: { Authorization: `Bearer ${token}`, Prefer: 'outlook.timezone="UTC"' },
    });
    if (!res.ok) throw new Error(`graph calendarView ${res.status}`);
    const d = await res.json();
    return (d.value || [])
      .filter((e: { isCancelled?: boolean; showAs?: string }) => !e.isCancelled && e.showAs !== 'free')
      .map((e: { start: { dateTime: string }; end: { dateTime: string } }) => ({
        startsAt: new Date(e.start.dateTime + 'Z').toISOString(),
        endsAt: new Date(e.end.dateTime + 'Z').toISOString(),
        status: 'confirmed',
      }));
  } catch (err) {
    console.error(`importBusy (${conn.provider}) failed:`, err);
    await db.update(calendarConnections).set({ status: 'error', lastError: String(err).slice(0, 300), updatedAt: new Date().toISOString() }).where(eq(calendarConnections.id, conn.id));
    return [];
  }
}

/** Aggregate busy blocks across all of a profile's active inbound connections. */
export async function busyForConnections(profileId: number, from: Date, to: Date): Promise<BusyEvent[]> {
  const conns = await db.select().from(calendarConnections).where(and(eq(calendarConnections.profileId, profileId), eq(calendarConnections.status, 'active'), eq(calendarConnections.syncInbound, true)));
  const out: BusyEvent[] = [];
  for (const c of conns) out.push(...(await importBusy(c, from, to)));
  return out;
}

export interface PushableEvent { title: string; description?: string | null; location?: string | null; startsAt: string; endsAt: string; timezone?: string; }

/** Push a single Orbit event out to a connected calendar (opt-in outbound sync). */
export async function pushEvent(conn: CalendarConnection, ev: PushableEvent): Promise<string | null> {
  const token = await validAccessToken(conn);
  if (!token) return null;
  try {
    if (conn.provider === 'google') {
      const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(conn.calendarId || 'primary')}/events`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary: ev.title, description: ev.description || undefined, location: ev.location || undefined,
          start: { dateTime: new Date(ev.startsAt).toISOString() }, end: { dateTime: new Date(ev.endsAt).toISOString() },
        }),
      });
      if (!res.ok) throw new Error(`google insert ${res.status}`);
      return (await res.json()).id ?? null;
    }
    const res = await fetch('https://graph.microsoft.com/v1.0/me/events', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject: ev.title,
        body: ev.description ? { contentType: 'text', content: ev.description } : undefined,
        location: ev.location ? { displayName: ev.location } : undefined,
        start: { dateTime: new Date(ev.startsAt).toISOString(), timeZone: 'UTC' },
        end: { dateTime: new Date(ev.endsAt).toISOString(), timeZone: 'UTC' },
      }),
    });
    if (!res.ok) throw new Error(`graph create ${res.status}`);
    return (await res.json()).id ?? null;
  } catch (err) {
    console.error(`pushEvent (${conn.provider}) failed:`, err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Queries for the UI (never expose tokens)
// ---------------------------------------------------------------------------

export interface PublicConnection {
  id: number; provider: Provider; label: string; accountEmail: string | null;
  syncInbound: boolean; syncOutbound: boolean; status: string; lastSyncedAt: string | null; lastError: string | null;
}

export function sanitize(c: CalendarConnection): PublicConnection {
  return {
    id: c.id, provider: c.provider as Provider, label: providerLabel(c.provider as Provider), accountEmail: c.accountEmail,
    syncInbound: c.syncInbound, syncOutbound: c.syncOutbound, status: c.status, lastSyncedAt: c.lastSyncedAt, lastError: c.lastError,
  };
}

export async function listConnections(profileId: number): Promise<PublicConnection[]> {
  const rows = await db.select().from(calendarConnections).where(eq(calendarConnections.profileId, profileId));
  return rows.map(sanitize);
}

export async function disconnect(profileId: number, id: number): Promise<void> {
  await db.delete(calendarConnections).where(and(eq(calendarConnections.id, id), eq(calendarConnections.profileId, profileId)));
}

export async function setConnectionOptions(profileId: number, id: number, patch: { syncInbound?: boolean; syncOutbound?: boolean }): Promise<PublicConnection | null> {
  const set: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (typeof patch.syncInbound === 'boolean') set.syncInbound = patch.syncInbound;
  if (typeof patch.syncOutbound === 'boolean') set.syncOutbound = patch.syncOutbound;
  const rows = await db.update(calendarConnections).set(set).where(and(eq(calendarConnections.id, id), eq(calendarConnections.profileId, profileId))).returning();
  return rows[0] ? sanitize(rows[0]) : null;
}

/** Touch last_synced_at (called after a manual/periodic import). */
export async function markSynced(profileId: number): Promise<void> {
  await db.update(calendarConnections).set({ lastSyncedAt: new Date().toISOString() }).where(and(eq(calendarConnections.profileId, profileId), eq(calendarConnections.status, 'active')));
}

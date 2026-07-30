// Connector contract. Every platform integration implements this against the
// platform's OFFICIAL API. Connectors only read public content (or content on
// the operator's own assets) and only send from the operator's own account
// through supported endpoints. There is no scraping and no session hijacking.

import type { Platform, RawMention } from '../types';

export interface ConnectorCredentials {
  // Whatever the platform needs; resolved from env / secrets at call time.
  [key: string]: string | undefined;
}

export interface SearchParams {
  // Boolean/keyword query the platform natively understands.
  query: string;
  sinceIso?: string;
  limit?: number;
}

export interface SendParams {
  channel: 'public_reply' | 'dm';
  // For a public reply, the id of the post being replied to.
  inReplyToExternalId?: string;
  recipientExternalId?: string;
  body: string;
}

export interface SendResult {
  ok: boolean;
  externalMessageId?: string;
  error?: string;
}

export interface Connector {
  readonly platform: Platform;
  /** True if credentials are present so the connector can actually call out. */
  isConfigured(creds: ConnectorCredentials): boolean;
  /** Search public content for a query. Returns normalized mentions. */
  search(params: SearchParams, creds: ConnectorCredentials): Promise<RawMention[]>;
  /** Send an approved message. Called only after review + all compliance gates. */
  send(params: SendParams, creds: ConnectorCredentials): Promise<SendResult>;
}

/** Resolve credentials for a platform from environment variables. */
export function credsFromEnv(platform: Platform): ConnectorCredentials {
  const p = platform.toUpperCase();
  return {
    bearerToken: process.env[`${p}_BEARER_TOKEN`],
    clientId: process.env[`${p}_CLIENT_ID`],
    clientSecret: process.env[`${p}_CLIENT_SECRET`],
    accessToken: process.env[`${p}_ACCESS_TOKEN`],
    accessSecret: process.env[`${p}_ACCESS_SECRET`],
    refreshToken: process.env[`${p}_REFRESH_TOKEN`],
    userAgent: process.env[`${p}_USER_AGENT`],
  };
}

// Reddit connector using the official OAuth API. Reads public submissions via
// the search endpoint and can reply from the operator's own account.
//
// Requires: REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, and either an app-only
// token (client_credentials) for search or a user token for posting. A
// descriptive REDDIT_USER_AGENT is required by Reddit's API rules.

import type { RawMention } from '../types';
import type { Connector, ConnectorCredentials, SearchParams, SendParams, SendResult } from './base';

const OAUTH = 'https://oauth.reddit.com';
const TOKEN_URL = 'https://www.reddit.com/api/v1/access_token';

async function appToken(creds: ConnectorCredentials): Promise<string | null> {
  if (!creds.clientId || !creds.clientSecret) return null;
  const basic = Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString('base64');
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      authorization: `Basic ${basic}`,
      'content-type': 'application/x-www-form-urlencoded',
      'user-agent': creds.userAgent ?? 'iprosper/1.0',
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { access_token?: string };
  return data.access_token ?? null;
}

export const redditConnector: Connector = {
  platform: 'reddit',

  isConfigured(creds) {
    return Boolean(creds.clientId && creds.clientSecret);
  },

  async search(params: SearchParams, creds: ConnectorCredentials): Promise<RawMention[]> {
    const token = creds.accessToken ?? (await appToken(creds));
    if (!token) return [];

    const url = new URL(`${OAUTH}/search`);
    url.searchParams.set('q', params.query);
    url.searchParams.set('limit', String(Math.min(params.limit ?? 25, 100)));
    url.searchParams.set('sort', 'new');
    url.searchParams.set('type', 'link');

    const res = await fetch(url, {
      headers: {
        authorization: `Bearer ${token}`,
        'user-agent': creds.userAgent ?? 'iprosper/1.0',
      },
    });
    if (!res.ok) {
      throw new Error(`Reddit search failed: ${res.status}`);
    }
    const data = (await res.json()) as RedditListing;

    return (data.data?.children ?? []).map((child) => {
      const p = child.data;
      const content = [p.title, p.selftext].filter(Boolean).join('\n');
      return {
        platform: 'reddit' as const,
        externalId: p.name, // fullname, e.g. t3_abc123
        permalink: `https://www.reddit.com${p.permalink}`,
        authorHandle: p.author,
        authorExternalId: p.author, // reddit exposes username as the stable id
        content,
        postedAt: p.created_utc ? new Date(p.created_utc * 1000).toISOString() : undefined,
      };
    });
  },

  async send(params: SendParams, creds: ConnectorCredentials): Promise<SendResult> {
    if (!creds.accessToken) {
      return { ok: false, error: 'Reddit posting requires a user OAuth token (REDDIT_ACCESS_TOKEN). Not configured.' };
    }
    if (params.channel !== 'public_reply' || !params.inReplyToExternalId) {
      return { ok: false, error: 'Reddit connector only supports public replies (comments).' };
    }
    const res = await fetch(`${OAUTH}/api/comment`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${creds.accessToken}`,
        'content-type': 'application/x-www-form-urlencoded',
        'user-agent': creds.userAgent ?? 'iprosper/1.0',
      },
      body: new URLSearchParams({
        api_type: 'json',
        thing_id: params.inReplyToExternalId,
        text: params.body,
      }),
    });
    if (!res.ok) {
      return { ok: false, error: `Reddit comment failed: ${res.status}` };
    }
    const data = (await res.json()) as RedditCommentResponse;
    const name = data.json?.data?.things?.[0]?.data?.name;
    if (data.json?.errors?.length) {
      return { ok: false, error: JSON.stringify(data.json.errors) };
    }
    return { ok: true, externalMessageId: name };
  },
};

interface RedditListing {
  data?: {
    children?: Array<{
      data: {
        name: string;
        title: string;
        selftext?: string;
        author: string;
        permalink: string;
        created_utc?: number;
      };
    }>;
  };
}

interface RedditCommentResponse {
  json?: {
    errors?: unknown[];
    data?: { things?: Array<{ data?: { name?: string } }> };
  };
}

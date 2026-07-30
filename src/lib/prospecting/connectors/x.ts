// X (Twitter) connector using the official API v2. Reads public tweets via the
// recent-search endpoint and posts replies from the operator's own account.
//
// Requires app credentials in env: X_BEARER_TOKEN for search. Posting a reply
// requires OAuth 1.0a user context (X_ACCESS_TOKEN / X_ACCESS_SECRET) or an
// OAuth2 user token — the wiring is left as a clearly marked integration point
// since it depends on the operator's app auth choice.

import type { RawMention } from '../types';
import type { Connector, ConnectorCredentials, SearchParams, SendParams, SendResult } from './base';

const API = 'https://api.twitter.com/2';

export const xConnector: Connector = {
  platform: 'x',

  isConfigured(creds) {
    return Boolean(creds.bearerToken);
  },

  async search(params: SearchParams, creds: ConnectorCredentials): Promise<RawMention[]> {
    if (!creds.bearerToken) return [];
    const url = new URL(`${API}/tweets/search/recent`);
    // -is:retweet keeps us on original public posts; lang optional.
    url.searchParams.set('query', `${params.query} -is:retweet -is:reply`);
    url.searchParams.set('max_results', String(Math.min(params.limit ?? 25, 100)));
    url.searchParams.set('tweet.fields', 'created_at,lang,author_id');
    url.searchParams.set('expansions', 'author_id');
    url.searchParams.set('user.fields', 'username');
    if (params.sinceIso) url.searchParams.set('start_time', params.sinceIso);

    const res = await fetch(url, {
      headers: { authorization: `Bearer ${creds.bearerToken}` },
    });
    if (!res.ok) {
      throw new Error(`X search failed: ${res.status} ${await safeText(res)}`);
    }
    const data = (await res.json()) as XSearchResponse;
    const users = new Map((data.includes?.users ?? []).map((u) => [u.id, u.username]));

    return (data.data ?? []).map((tweet) => ({
      platform: 'x' as const,
      externalId: tweet.id,
      permalink: `https://x.com/i/web/status/${tweet.id}`,
      authorHandle: users.get(tweet.author_id),
      authorExternalId: tweet.author_id,
      content: tweet.text,
      lang: tweet.lang,
      postedAt: tweet.created_at,
    }));
  },

  async send(params: SendParams, creds: ConnectorCredentials): Promise<SendResult> {
    // Posting requires user-context auth. If it isn't configured, fail closed
    // with a clear message rather than pretending to send.
    if (!creds.accessToken) {
      return { ok: false, error: 'X posting requires user-context OAuth (X_ACCESS_TOKEN). Not configured.' };
    }
    if (params.channel !== 'public_reply' || !params.inReplyToExternalId) {
      return { ok: false, error: 'X connector only supports public replies to a specific tweet.' };
    }
    // NOTE: Real implementation posts to POST /2/tweets with
    // { text, reply: { in_reply_to_tweet_id } } signed with the user token.
    // Left unimplemented intentionally so nothing sends without the operator
    // completing their app's auth flow.
    return { ok: false, error: 'X send not wired: complete OAuth user-context setup to enable.' };
  },
};

async function safeText(res: Response): Promise<string> {
  try {
    return (await res.text()).slice(0, 300);
  } catch {
    return '';
  }
}

interface XSearchResponse {
  data?: Array<{
    id: string;
    text: string;
    created_at?: string;
    lang?: string;
    author_id: string;
  }>;
  includes?: {
    users?: Array<{ id: string; username: string }>;
  };
}

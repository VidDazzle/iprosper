// Listen-only "web" connector: reads public RSS/Atom feeds (blogs, forums, and
// Q&A sites that publish feeds) and returns items as normalized mentions. Feed
// URLs are configured via the RSS_FEED_URLS env var (comma-separated).
//
// This connector never posts. Prospects it surfaces are routed to a human or an
// owned channel — we do not auto-reply on arbitrary third-party websites.

import type { RawMention } from '../types';
import type { Connector, ConnectorCredentials, SearchParams, SendParams, SendResult } from './base';

function feedUrls(creds: ConnectorCredentials): string[] {
  const raw = creds.feedUrls ?? process.env.RSS_FEED_URLS ?? '';
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

// Minimal, dependency-free RSS/Atom item extraction. Good enough to pull
// title/link/description/pubDate from well-formed public feeds.
function parseFeed(xml: string, source: string): RawMention[] {
  const items: RawMention[] = [];
  const blocks = [...xml.matchAll(/<(item|entry)[\s>][\s\S]*?<\/(item|entry)>/g)].map((m) => m[0]);
  for (const block of blocks) {
    const title = tag(block, 'title');
    const link = attrLink(block) ?? tag(block, 'link');
    const desc = tag(block, 'description') ?? tag(block, 'summary') ?? tag(block, 'content');
    const pub = tag(block, 'pubDate') ?? tag(block, 'updated') ?? tag(block, 'published');
    const guid = tag(block, 'guid') ?? tag(block, 'id') ?? link ?? title;
    if (!title && !desc) continue;
    items.push({
      platform: 'web',
      externalId: `${source}:${(guid ?? title ?? '').slice(0, 200)}`,
      permalink: link ?? undefined,
      content: [title, stripHtml(desc ?? '')].filter(Boolean).join('\n'),
      postedAt: pub ? safeDate(pub) : undefined,
    });
  }
  return items;
}

function tag(block: string, name: string): string | undefined {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'));
  if (!m) return undefined;
  return decode(m[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim());
}

function attrLink(block: string): string | undefined {
  // Atom uses <link href="..."/>
  const m = block.match(/<link[^>]*href=["']([^"']+)["']/i);
  return m ? m[1] : undefined;
}

function stripHtml(s: string): string {
  return decode(s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
}

function decode(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function safeDate(s: string): string | undefined {
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

export const rssConnector: Connector = {
  platform: 'web',

  isConfigured(creds) {
    return feedUrls(creds).length > 0;
  },

  async search(params: SearchParams, creds: ConnectorCredentials): Promise<RawMention[]> {
    const urls = feedUrls(creds);
    const out: RawMention[] = [];
    for (const url of urls) {
      try {
        const res = await fetch(url, { headers: { 'user-agent': creds.userAgent ?? 'iprosper/1.0 (+https://iprosper.io)' } });
        if (!res.ok) continue;
        const xml = await res.text();
        out.push(...parseFeed(xml, hostOf(url)));
      } catch {
        // Skip unreachable feeds; ingestion continues with the rest.
      }
    }
    const limit = params.limit ?? 50;
    return out.slice(0, limit);
  },

  async send(_params: SendParams, _creds: ConnectorCredentials): Promise<SendResult> {
    return { ok: false, error: 'The web (RSS) source is listen-only; it cannot post replies.' };
  },
};

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return 'feed';
  }
}

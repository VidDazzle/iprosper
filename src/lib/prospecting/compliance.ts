// Compliance helpers: disclosure injection, jurisdiction inference, and the
// per-platform Terms-of-Service guard. These are deliberately conservative —
// when in doubt, the pipeline blocks rather than sends.

import type { Platform } from './types';

/**
 * Per-platform outreach policy. `automatedOutreachAllowed` gates whether the
 * pipeline may auto-draft/send at all; `requiresBotDisclosure` forces a bot
 * disclosure line onto messages; `maxPerDay` is a conservative frequency cap.
 *
 * These are safe defaults, not legal advice. Operators must keep them in sync
 * with each platform's current developer terms. A platform policy change should
 * flip the relevant flag here (or set the connector to `disabled_by_policy`)
 * rather than being silently ignored.
 */
export interface PlatformPolicy {
  automatedOutreachAllowed: boolean;
  requiresBotDisclosure: boolean;
  // Public replies vs DMs each have their own cap.
  maxPublicRepliesPerDay: number;
  maxDmsPerDay: number;
  // Minimum spacing between messages to the same person, in hours.
  perProspectCooldownHours: number;
}

export const PLATFORM_POLICIES: Record<Platform, PlatformPolicy> = {
  x: {
    automatedOutreachAllowed: true,
    requiresBotDisclosure: true,
    maxPublicRepliesPerDay: 50,
    maxDmsPerDay: 0, // DMs to strangers are heavily restricted; default off.
    perProspectCooldownHours: 24 * 30,
  },
  reddit: {
    automatedOutreachAllowed: true,
    requiresBotDisclosure: true,
    maxPublicRepliesPerDay: 25, // Reddit is strict about promotional replies.
    maxDmsPerDay: 0,
    perProspectCooldownHours: 24 * 60,
  },
  youtube: {
    automatedOutreachAllowed: true,
    requiresBotDisclosure: true,
    maxPublicRepliesPerDay: 30,
    maxDmsPerDay: 0,
    perProspectCooldownHours: 24 * 30,
  },
  instagram: {
    automatedOutreachAllowed: false, // Graph API only allows replies within 24h windows on your own media.
    requiresBotDisclosure: true,
    maxPublicRepliesPerDay: 20,
    maxDmsPerDay: 0,
    perProspectCooldownHours: 24 * 30,
  },
  tiktok: {
    automatedOutreachAllowed: false, // Display API is read-only; no automated posting.
    requiresBotDisclosure: true,
    maxPublicRepliesPerDay: 0,
    maxDmsPerDay: 0,
    perProspectCooldownHours: 24 * 30,
  },
  linkedin: {
    automatedOutreachAllowed: false, // Marketing API forbids automated cold outreach.
    requiresBotDisclosure: true,
    maxPublicRepliesPerDay: 0,
    maxDmsPerDay: 0,
    perProspectCooldownHours: 24 * 90,
  },
};

/** Standard affiliate disclosure required by the FTC endorsement guides. */
export const AFFILIATE_DISCLOSURE =
  '#ad — this contains an affiliate link; I may earn a commission at no extra cost to you.';

/** Bot disclosure for platforms that require it. */
export const BOT_DISCLOSURE = 'Sent by an automated assistant on behalf of iProsper.';

export interface DisclosureOptions {
  isAffiliate: boolean;
  platform: Platform;
  channel: 'public_reply' | 'dm';
}

/**
 * Build the disclosure string that must be appended to a message. Returns an
 * empty string only when nothing is required (which should be rare).
 */
export function buildDisclosure(opts: DisclosureOptions): string {
  const parts: string[] = [];
  if (opts.isAffiliate) parts.push(AFFILIATE_DISCLOSURE);
  if (PLATFORM_POLICIES[opts.platform].requiresBotDisclosure) parts.push(BOT_DISCLOSURE);
  return parts.join(' ');
}

/**
 * Ensure a drafted message carries its required disclosure. If the disclosure
 * text is not already present, it is appended. This is the last line of defense
 * before a message can be marked sendable.
 */
export function enforceDisclosure(body: string, disclosure: string): string {
  if (!disclosure) return body;
  if (body.includes(disclosure)) return body;
  return `${body.trim()}\n\n${disclosure}`;
}

/**
 * Best-effort jurisdiction inference from lightweight signals. This is a hint
 * for privacy-regime handling, not a determination. Unknown => null (treated as
 * the strictest applicable defaults downstream).
 */
export function inferJurisdiction(signals: {
  lang?: string | null;
  countryHint?: string | null;
}): string | null {
  const c = signals.countryHint?.toUpperCase();
  if (!c) return null;
  const eu = new Set([
    'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR',
    'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK',
    'SI', 'ES', 'SE',
  ]);
  if (eu.has(c)) return 'EU';
  if (c === 'GB') return 'UK';
  if (c === 'US') return 'US';
  return c;
}

export interface OutreachGate {
  allowed: boolean;
  reason?: string;
}

/**
 * Decide whether outreach on a platform/channel is permitted at all, before we
 * even draft. Blocks disallowed channels and policy-disabled platforms.
 */
export function checkOutreachAllowed(
  platform: Platform,
  channel: 'public_reply' | 'dm',
): OutreachGate {
  const policy = PLATFORM_POLICIES[platform];
  if (!policy.automatedOutreachAllowed) {
    return { allowed: false, reason: `Automated outreach is disabled for ${platform} by policy.` };
  }
  if (channel === 'dm' && policy.maxDmsPerDay <= 0) {
    return { allowed: false, reason: `DMs are not permitted for ${platform}.` };
  }
  if (channel === 'public_reply' && policy.maxPublicRepliesPerDay <= 0) {
    return { allowed: false, reason: `Public replies are not permitted for ${platform}.` };
  }
  return { allowed: true };
}

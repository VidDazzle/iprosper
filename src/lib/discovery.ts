/**
 * Evolve Discover — opt-in, interest-matched, radius-based discovery.
 *
 * Privacy rules baked in:
 *  - Exact coordinates are NEVER returned to another user — only a coarse
 *    distance ("~3 mi") and shared interests.
 *  - You must be identity-verified and opt in (`discoverable`) to appear.
 *  - Your photo is revealed to another person only if you "tap" them.
 *  - Mutual taps = a match; both people are notified.
 */

import { db } from '@/db';
import { lifeProfiles, lifePreferences, taps, meetupRequests } from '@/db/schema';
import { and, eq, ne, or, gte } from 'drizzle-orm';
import { notify } from '@/lib/notify';
import { blockedSet, isBlockedEither } from '@/lib/safety';

type Profile = typeof lifeProfiles.$inferSelect;

// Abuse rate limits (anti-spam / anti-harassment).
const TAP_DAILY_CAP = 100;
const TAP_BURST_PER_MIN = 8;
const MEETUP_DAILY_CAP = 20;
const MEETUP_PER_MATCH_DAILY = 5;

async function countTapsSince(profileId: number, sinceIso: string): Promise<number> {
  const rows = await db.select().from(taps).where(and(eq(taps.fromProfileId, profileId), gte(taps.createdAt, sinceIso)));
  return rows.length;
}
async function countMeetupsSince(profileId: number, sinceIso: string, toProfileId?: number): Promise<number> {
  const rows = await db.select().from(meetupRequests).where(and(eq(meetupRequests.fromProfileId, profileId), gte(meetupRequests.createdAt, sinceIso)));
  return toProfileId ? rows.filter((r) => r.toProfileId === toProfileId).length : rows.length;
}
function isoAgo(ms: number): string { return new Date(Date.now() - ms).toISOString(); }

/** True only when BOTH people have tapped each other (mutual interest). */
async function areMatched(aId: number, bId: number): Promise<boolean> {
  const rows = await db
    .select()
    .from(taps)
    .where(and(eq(taps.fromProfileId, aId), eq(taps.toProfileId, bId), eq(taps.matched, true)))
    .limit(1);
  return rows.length > 0;
}

const MILE_KM = 1.60934;

function haversineMiles(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  const km = R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
  return km / MILE_KM;
}

/** Coarsen distance so it never pinpoints anyone: <1, then rounded miles. */
function coarseDistance(mi: number): string {
  if (mi < 1) return 'within 1 mi';
  return `~${Math.round(mi)} mi`;
}

async function interestsOf(profileId: number): Promise<Set<string>> {
  const rows = await db.select().from(lifePreferences).where(eq(lifePreferences.profileId, profileId));
  // Match on the fun/social categories (sports, activities, entertainment, cuisine).
  const social = new Set(['sport', 'activity', 'entertainment', 'cuisine', 'movie_genre', 'tv_genre']);
  return new Set(rows.filter((r) => social.has(r.category)).map((r) => r.value.toLowerCase()));
}

export interface NearbyPerson {
  profileId: number;
  name: string;
  bio: string | null;
  distance: string;
  sharedInterests: string[];
  photoUrl: string | null; // only if they've tapped me (revealed to me)
  theyTappedMe: boolean;
  iTappedThem: boolean;
  matched: boolean;
}

export async function nearby(me: Profile): Promise<NearbyPerson[]> {
  if (me.lastLat == null || me.lastLng == null) return [];
  const myInterests = await interestsOf(me.id);
  const radius = me.discoveryRadiusMiles || 5;

  const candidates = await db
    .select()
    .from(lifeProfiles)
    .where(and(eq(lifeProfiles.discoverable, true), ne(lifeProfiles.id, me.id)));

  // Taps involving me (either direction), for reveal + match state.
  const myTaps = await db
    .select()
    .from(taps)
    .where(or(eq(taps.fromProfileId, me.id), eq(taps.toProfileId, me.id)));

  // People I've blocked or who blocked me are hidden both ways.
  const blocked = await blockedSet(me.id);

  const out: NearbyPerson[] = [];
  for (const c of candidates) {
    if (blocked.has(c.id)) continue;
    if (c.lastLat == null || c.lastLng == null) continue;
    const mi = haversineMiles(me.lastLat, me.lastLng, c.lastLat, c.lastLng);
    if (mi > radius) continue;

    const theirInterests = await interestsOf(c.id);
    const shared = [...myInterests].filter((i) => theirInterests.has(i));
    if (shared.length === 0) continue; // "people with similar interests"

    const iTappedThem = myTaps.some((t) => t.fromProfileId === me.id && t.toProfileId === c.id);
    const theyTappedMe = myTaps.some((t) => t.fromProfileId === c.id && t.toProfileId === me.id);
    const matched = iTappedThem && theyTappedMe;

    out.push({
      profileId: c.id,
      name: c.displayName || (c.name ? c.name.split(' ')[0] : 'Someone'),
      bio: c.bio,
      distance: coarseDistance(mi),
      // Preserve original-case interest labels from my set where possible.
      sharedInterests: shared.map((s) => s.replace(/\b\w/g, (m) => m.toUpperCase())),
      // Reveal their photo to me only if they tapped me.
      photoUrl: theyTappedMe ? c.discoveryPhotoUrl : null,
      theyTappedMe,
      iTappedThem,
      matched,
    });
  }
  // Closest + most shared interests first.
  out.sort((a, b) => b.sharedInterests.length - a.sharedInterests.length);
  return out;
}

export interface TapResult { ok: boolean; matched: boolean; message: string; }

/**
 * Tap (express interest in) another person. This reveals MY photo to them.
 * If they already tapped me, it's a match and both of us are notified.
 */
export async function tap(me: Profile, toProfileId: number, message?: string): Promise<TapResult> {
  if (toProfileId === me.id) return { ok: false, matched: false, message: "You can't tap yourself." };
  const targetRows = await db.select().from(lifeProfiles).where(eq(lifeProfiles.id, toProfileId)).limit(1);
  const target = targetRows[0];
  if (!target) return { ok: false, matched: false, message: 'Person not found.' };
  if (await isBlockedEither(me.id, toProfileId)) return { ok: false, matched: false, message: 'This person is unavailable.' };

  // Rate limits (anti-spam). Skip counting duplicate taps to the same person.
  const alreadyTapped = await db.select().from(taps).where(and(eq(taps.fromProfileId, me.id), eq(taps.toProfileId, toProfileId))).limit(1);
  if (!alreadyTapped[0]) {
    if (await countTapsSince(me.id, isoAgo(60_000)) >= TAP_BURST_PER_MIN) return { ok: false, matched: false, message: 'Slow down — too many taps at once. Try again in a minute.' };
    if (await countTapsSince(me.id, isoAgo(86_400_000)) >= TAP_DAILY_CAP) return { ok: false, matched: false, message: 'You’ve reached today’s tap limit.' };
  }

  const now = new Date().toISOString();
  // Idempotent: ignore if I already tapped them.
  const existing = await db.select().from(taps).where(and(eq(taps.fromProfileId, me.id), eq(taps.toProfileId, toProfileId))).limit(1);
  if (!existing[0]) {
    await db.insert(taps).values({ fromProfileId: me.id, toProfileId, message: message || null, matched: false, createdAt: now });
  }

  // Did they already tap me? -> match.
  const reverse = await db.select().from(taps).where(and(eq(taps.fromProfileId, toProfileId), eq(taps.toProfileId, me.id))).limit(1);
  const myName = me.displayName || me.name || 'Someone';
  const theirName = target.displayName || target.name || 'Someone';

  if (reverse[0]) {
    await db.update(taps).set({ matched: true }).where(and(eq(taps.fromProfileId, me.id), eq(taps.toProfileId, toProfileId)));
    await db.update(taps).set({ matched: true }).where(and(eq(taps.fromProfileId, toProfileId), eq(taps.toProfileId, me.id)));
    // Notify BOTH — "the person is also interested in you."
    await notify({ channel: (me.reminderChannel as any) || 'email', title: "🎉 It's a match!", body: `You and ${theirName} both tapped each other. You can chat now.`, to: me.email, phone: me.phone, profileId: me.id, inAppType: 'match', link: '/chat' });
    await notify({ channel: (target.reminderChannel as any) || 'email', title: "🎉 It's a match!", body: `You and ${myName} both tapped each other. You can chat now.`, to: target.email, phone: target.phone, profileId: target.id, inAppType: 'match', link: '/chat' });
    return { ok: true, matched: true, message: `It's a match with ${theirName}!` };
  }

  // Otherwise notify the target that someone is interested.
  await notify({ channel: (target.reminderChannel as any) || 'email', title: 'Someone is interested in you', body: `${myName} tapped you on Evolve Discover — ${sharedLine(me, target)}. Tap back to match.`, to: target.email, phone: target.phone, profileId: target.id, inAppType: 'tap', link: '/discover' });
  return { ok: true, matched: false, message: `You tapped ${theirName}. They’ll be notified.` };
}

function sharedLine(a: Profile, b: Profile): string {
  return 'you have interests in common';
}

export interface MatchInfo {
  profileId: number;
  name: string;
  photoUrl: string | null;
  iSharedPhone: boolean;
  partnerPhone: string | null; // visible only if the partner shared it
  meetups: { id: number; fromMe: boolean; whenAt: string; note: string | null; status: string }[];
}

export async function matches(me: Profile): Promise<MatchInfo[]> {
  const mine = await db.select().from(taps).where(and(eq(taps.fromProfileId, me.id), eq(taps.matched, true)));
  const out: MatchInfo[] = [];
  for (const t of mine) {
    const p = (await db.select().from(lifeProfiles).where(eq(lifeProfiles.id, t.toProfileId)).limit(1))[0];
    if (!p) continue;
    // Did the partner share their phone with me?
    const theirTap = (await db.select().from(taps).where(and(eq(taps.fromProfileId, p.id), eq(taps.toProfileId, me.id))).limit(1))[0];
    const partnerShared = theirTap?.sharedPhone;
    const reqs = await db
      .select()
      .from(meetupRequests)
      .where(or(
        and(eq(meetupRequests.fromProfileId, me.id), eq(meetupRequests.toProfileId, p.id)),
        and(eq(meetupRequests.fromProfileId, p.id), eq(meetupRequests.toProfileId, me.id)),
      ));
    out.push({
      profileId: p.id,
      name: p.displayName || p.name || 'Match',
      photoUrl: p.discoveryPhotoUrl,
      iSharedPhone: t.sharedPhone,
      partnerPhone: partnerShared ? p.phone : null,
      meetups: reqs
        .sort((a, b) => a.whenAt.localeCompare(b.whenAt))
        .map((r) => ({ id: r.id, fromMe: r.fromProfileId === me.id, whenAt: r.whenAt, note: r.note, status: r.status })),
    });
  }
  return out;
}

/** After a match, opt to share your phone number with that person. */
export async function sharePhone(me: Profile, toProfileId: number): Promise<{ ok: boolean; message: string }> {
  if (!(await areMatched(me.id, toProfileId))) return { ok: false, message: 'You can only share your number with a match.' };
  if (!me.phone) return { ok: false, message: 'Add your phone number to your profile first.' };
  await db.update(taps).set({ sharedPhone: true }).where(and(eq(taps.fromProfileId, me.id), eq(taps.toProfileId, toProfileId)));
  const target = (await db.select().from(lifeProfiles).where(eq(lifeProfiles.id, toProfileId)).limit(1))[0];
  if (target) {
    await notify({ channel: (target.reminderChannel as any) || 'email', title: '📱 Your match shared their number', body: `${me.displayName || me.name || 'Your match'} shared their phone number with you on Evolve Discover.`, to: target.email, phone: target.phone, profileId: target.id, inAppType: 'message', link: '/discover' });
  }
  return { ok: true, message: 'Number shared with your match.' };
}

/** After a match, request a specific time to meet. */
export async function requestMeetup(me: Profile, toProfileId: number, whenAt: string, note?: string): Promise<{ ok: boolean; message: string; id?: number }> {
  if (await isBlockedEither(me.id, toProfileId)) return { ok: false, message: 'This person is unavailable.' };
  if (!(await areMatched(me.id, toProfileId))) return { ok: false, message: 'You can only request a time with a match.' };
  if (await countMeetupsSince(me.id, isoAgo(86_400_000), toProfileId) >= MEETUP_PER_MATCH_DAILY) return { ok: false, message: 'Too many time requests to this match today.' };
  if (await countMeetupsSince(me.id, isoAgo(86_400_000)) >= MEETUP_DAILY_CAP) return { ok: false, message: 'You’ve reached today’s meetup-request limit.' };
  const now = new Date().toISOString();
  const inserted = await db.insert(meetupRequests).values({
    fromProfileId: me.id, toProfileId, whenAt: new Date(whenAt).toISOString(), note: note || null, status: 'proposed', createdAt: now, updatedAt: now,
  }).returning();
  const target = (await db.select().from(lifeProfiles).where(eq(lifeProfiles.id, toProfileId)).limit(1))[0];
  if (target) {
    await notify({ channel: (target.reminderChannel as any) || 'email', title: '📅 Your match suggested a time', body: `${me.displayName || me.name || 'Your match'} wants to meet ${new Date(whenAt).toLocaleString('en-US')}${note ? ` — “${note}”` : ''}.`, to: target.email, phone: target.phone, profileId: target.id, inAppType: 'meetup', link: '/discover' });
  }
  return { ok: true, message: 'Time requested.', id: inserted[0].id };
}

export async function respondMeetup(me: Profile, id: number, action: 'accept' | 'decline'): Promise<{ ok: boolean; status: string }> {
  const req = (await db.select().from(meetupRequests).where(eq(meetupRequests.id, id)).limit(1))[0];
  if (!req || req.toProfileId !== me.id) return { ok: false, status: 'not_found' };
  const status = action === 'accept' ? 'accepted' : 'declined';
  await db.update(meetupRequests).set({ status, updatedAt: new Date().toISOString() }).where(eq(meetupRequests.id, id));
  const other = (await db.select().from(lifeProfiles).where(eq(lifeProfiles.id, req.fromProfileId)).limit(1))[0];
  if (other) {
    await notify({ channel: (other.reminderChannel as any) || 'email', title: status === 'accepted' ? '✅ Your match said yes!' : 'Your match passed on that time', body: status === 'accepted' ? `${me.displayName || me.name || 'Your match'} accepted your time to meet.` : `${me.displayName || me.name || 'Your match'} can't make that time — try another.`, to: other.email, phone: other.phone, profileId: other.id, inAppType: 'meetup', link: '/discover' });
  }
  return { ok: true, status };
}

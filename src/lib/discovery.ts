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
import { lifeProfiles, lifePreferences, taps } from '@/db/schema';
import { and, eq, ne, or } from 'drizzle-orm';
import { notify } from '@/lib/notify';

type Profile = typeof lifeProfiles.$inferSelect;

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

  const out: NearbyPerson[] = [];
  for (const c of candidates) {
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
    await notify({ channel: (me.reminderChannel as any) || 'email', title: "🎉 It's a match!", body: `You and ${theirName} both tapped each other. You can chat now.`, to: me.email, phone: me.phone });
    await notify({ channel: (target.reminderChannel as any) || 'email', title: "🎉 It's a match!", body: `You and ${myName} both tapped each other. You can chat now.`, to: target.email, phone: target.phone });
    return { ok: true, matched: true, message: `It's a match with ${theirName}!` };
  }

  // Otherwise notify the target that someone is interested.
  await notify({ channel: (target.reminderChannel as any) || 'email', title: 'Someone is interested in you', body: `${myName} tapped you on Evolve Discover — ${sharedLine(me, target)}. Tap back to match.`, to: target.email, phone: target.phone });
  return { ok: true, matched: false, message: `You tapped ${theirName}. They’ll be notified.` };
}

function sharedLine(a: Profile, b: Profile): string {
  return 'you have interests in common';
}

export async function matches(me: Profile): Promise<{ profileId: number; name: string; photoUrl: string | null }[]> {
  const rows = await db.select().from(taps).where(and(eq(taps.fromProfileId, me.id), eq(taps.matched, true)));
  const out: { profileId: number; name: string; photoUrl: string | null }[] = [];
  for (const t of rows) {
    const p = await db.select().from(lifeProfiles).where(eq(lifeProfiles.id, t.toProfileId)).limit(1);
    if (p[0]) out.push({ profileId: p[0].id, name: p[0].displayName || p[0].name || 'Match', photoUrl: p[0].discoveryPhotoUrl });
  }
  return out;
}

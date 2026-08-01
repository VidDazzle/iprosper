/**
 * Safety controls for Evolve Discover: block / report / unmatch, plus the
 * blocked-set used to hide people from each other.
 */

import { db } from '@/db';
import { blocks, reports, taps, meetupRequests, identityVerifications, lifeProfiles } from '@/db/schema';
import { and, eq, or } from 'drizzle-orm';

/** Age-assured identity: verified AND confirmed 18+. Gates all Discover actions. */
export async function isAdultVerified(profileId: number): Promise<boolean> {
  const rows = await db
    .select()
    .from(identityVerifications)
    .where(and(eq(identityVerifications.profileId, profileId), eq(identityVerifications.status, 'verified'), eq(identityVerifications.adult, true)))
    .limit(1);
  return rows.length > 0;
}

/** Background screening passed (no disqualifying offense — sex crimes, trafficking, etc.). */
export async function isScreenedClear(profileId: number): Promise<boolean> {
  const rows = await db
    .select()
    .from(identityVerifications)
    .where(and(eq(identityVerifications.profileId, profileId), eq(identityVerifications.status, 'verified'), eq(identityVerifications.screening, 'clear')))
    .limit(1);
  return rows.length > 0;
}

/**
 * Full eligibility for Discover: 18+ identity-verified AND background-screening
 * cleared. This is the anti-trafficking / offender gate — required to be
 * discoverable, tap, or match.
 */
export async function isEligibleForDiscovery(profileId: number): Promise<boolean> {
  if (await isSuspended(profileId)) return false;
  return (await isAdultVerified(profileId)) && (await isScreenedClear(profileId));
}

export async function isSuspended(profileId: number): Promise<boolean> {
  const rows = await db.select().from(lifeProfiles).where(eq(lifeProfiles.id, profileId)).limit(1);
  return Boolean(rows[0]?.suspended);
}

/** Suspend/unsuspend a member. Suspending also pulls them from Discover. */
export async function setSuspended(profileId: number, on: boolean): Promise<void> {
  const patch: Record<string, unknown> = { suspended: on, updatedAt: new Date().toISOString() };
  if (on) patch.discoverable = false;
  await db.update(lifeProfiles).set(patch).where(eq(lifeProfiles.id, profileId));
}

/** Ids this person can't see / interact with (they blocked, or were blocked by). */
export async function blockedSet(profileId: number): Promise<Set<number>> {
  const rows = await db
    .select()
    .from(blocks)
    .where(or(eq(blocks.blockerProfileId, profileId), eq(blocks.blockedProfileId, profileId)));
  const s = new Set<number>();
  for (const b of rows) s.add(b.blockerProfileId === profileId ? b.blockedProfileId : b.blockerProfileId);
  return s;
}

export async function isBlockedEither(aId: number, bId: number): Promise<boolean> {
  const rows = await db
    .select()
    .from(blocks)
    .where(or(
      and(eq(blocks.blockerProfileId, aId), eq(blocks.blockedProfileId, bId)),
      and(eq(blocks.blockerProfileId, bId), eq(blocks.blockedProfileId, aId)),
    ))
    .limit(1);
  return rows.length > 0;
}

/** Remove any taps + meetup requests between two people (the unmatch effect). */
async function severTies(aId: number, bId: number): Promise<void> {
  await db.delete(taps).where(or(
    and(eq(taps.fromProfileId, aId), eq(taps.toProfileId, bId)),
    and(eq(taps.fromProfileId, bId), eq(taps.toProfileId, aId)),
  ));
  await db.delete(meetupRequests).where(or(
    and(eq(meetupRequests.fromProfileId, aId), eq(meetupRequests.toProfileId, bId)),
    and(eq(meetupRequests.fromProfileId, bId), eq(meetupRequests.toProfileId, aId)),
  ));
}

export async function blockUser(meId: number, targetId: number): Promise<void> {
  if (meId === targetId) return;
  const existing = await db.select().from(blocks).where(and(eq(blocks.blockerProfileId, meId), eq(blocks.blockedProfileId, targetId))).limit(1);
  if (!existing[0]) {
    await db.insert(blocks).values({ blockerProfileId: meId, blockedProfileId: targetId, createdAt: new Date().toISOString() });
  }
  await severTies(meId, targetId); // unmatch + clear requests
}

export async function unblockUser(meId: number, targetId: number): Promise<void> {
  await db.delete(blocks).where(and(eq(blocks.blockerProfileId, meId), eq(blocks.blockedProfileId, targetId)));
}

/** Unmatch without blocking — just sever the connection. */
export async function unmatch(meId: number, targetId: number): Promise<void> {
  await severTies(meId, targetId);
}

export async function reportUser(meId: number, targetId: number, reason: string, detail?: string): Promise<void> {
  await db.insert(reports).values({
    reporterProfileId: meId, reportedProfileId: targetId, reason: reason || 'unspecified', detail: detail || null, status: 'open', createdAt: new Date().toISOString(),
  });
  // Reporting also blocks, per standard trust-and-safety UX.
  await blockUser(meId, targetId);
}

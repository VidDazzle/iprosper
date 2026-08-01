/**
 * Evolve Together helpers — connection resolution, each partner's daily
 * schedule, and mutual free-time (when BOTH are available) for planning a date.
 */

import { db } from '@/db';
import { connections, personalEvents, lifeProfiles, identityVerifications } from '@/db/schema';
import { and, eq, gte, lte, or, inArray } from 'drizzle-orm';
import { findFreeSlots, type AvailabilityRule, type BusyEvent } from '@/lib/scheduling';

export type Connection = typeof connections.$inferSelect;
export type LifeProfile = typeof lifeProfiles.$inferSelect;

/** The active connection this profile belongs to (as inviter or invitee). */
export async function activeConnectionFor(profileId: number): Promise<Connection | null> {
  const rows = await db
    .select()
    .from(connections)
    .where(
      and(
        eq(connections.status, 'active'),
        or(eq(connections.inviterProfileId, profileId), eq(connections.inviteeProfileId, profileId)),
      ),
    )
    .limit(1);
  return rows[0] || null;
}

export function partnerIdOf(conn: Connection, profileId: number): number | null {
  if (conn.inviterProfileId === profileId) return conn.inviteeProfileId;
  if (conn.inviteeProfileId === profileId) return conn.inviterProfileId;
  return null;
}

/** Broad personal availability (not work hours) so evenings/weekends surface. */
function personalRules(timezone: string): AvailabilityRule[] {
  return [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
    dayOfWeek, startTime: '07:00', endTime: '23:00', timezone, slotMinutes: 30, enabled: true,
  }));
}

/** Personal (Orbit) events for a set of profiles in a window. */
async function eventsFor(profileIds: number[], from: Date, to: Date): Promise<(typeof personalEvents.$inferSelect)[]> {
  return db
    .select()
    .from(personalEvents)
    .where(
      and(
        gte(personalEvents.startsAt, from.toISOString()),
        lte(personalEvents.startsAt, to.toISOString()),
        inArray(personalEvents.profileId, profileIds),
      ),
    );
}

/** A single profile's Orbit events for a given local day. */
export async function dailySchedule(profileId: number, dayIso: string) {
  const day = new Date(dayIso);
  const from = new Date(day); from.setHours(0, 0, 0, 0);
  const to = new Date(day); to.setHours(23, 59, 59, 999);
  const rows = await eventsFor([profileId], from, to);
  return rows.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

/**
 * Slots where BOTH partners are free: union both partners' busy events, then
 * find open windows across the shared window.
 */
export async function mutualFreeSlots(
  aId: number,
  bId: number,
  timezone: string,
  durationMin = 120,
  days = 7,
): Promise<{ start: string; end: string; label: string }[]> {
  const from = new Date();
  const to = new Date(from); to.setDate(to.getDate() + days);
  const events = await eventsFor([aId, bId], from, to);
  const busy: BusyEvent[] = events.map((e) => ({ startsAt: e.startsAt, endsAt: e.endsAt, status: 'confirmed' }));
  const slots = findFreeSlots(personalRules(timezone), busy, from, to, durationMin);
  // Prefer date-friendly times (>= 5pm) and cap the list.
  return slots
    .filter((s) => {
      const hr = Number(new Date(s.start).toLocaleString('en-US', { timeZone: timezone, hour: '2-digit', hour12: false }));
      return hr >= 17;
    })
    .slice(0, 8)
    .map((s) => ({
      start: s.start, end: s.end,
      label: new Date(s.start).toLocaleString('en-US', {
        timeZone: timezone, weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
      }),
    }));
}

export async function isVerified(profileId: number): Promise<boolean> {
  const rows = await db
    .select()
    .from(identityVerifications)
    .where(and(eq(identityVerifications.profileId, profileId), eq(identityVerifications.status, 'verified')))
    .limit(1);
  return rows.length > 0;
}

/** Public-safe partner card (respects the share_location toggle). */
export function partnerCard(partner: LifeProfile, conn: Connection) {
  const share = conn.shareLocation && partner.shareLocation;
  return {
    id: partner.id,
    name: partner.name || partner.email,
    city: partner.city,
    timezone: partner.timezone,
    location: share && partner.lastLat != null && partner.lastLng != null
      ? { lat: partner.lastLat, lng: partner.lastLng, at: partner.lastLocationAt }
      : null,
    locationShared: share,
  };
}

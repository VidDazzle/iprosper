/**
 * Availability + free-slot math for the AI calendar.
 *
 * Times are stored as ISO-8601 UTC. Availability rules are expressed in local
 * wall-clock time for an IANA timezone (e.g. "09:00"–"17:00" America/New_York),
 * so we convert those wall-clock windows to precise UTC instants per day using
 * the Intl API (no external tz dependency).
 */

export interface AvailabilityRule {
  dayOfWeek: number; // 0 = Sunday .. 6 = Saturday
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
  timezone: string;
  slotMinutes: number;
  enabled: boolean;
}

export interface BusyEvent {
  startsAt: string; // ISO UTC
  endsAt: string; // ISO UTC
  status?: string;
}

export interface FreeSlot {
  start: string; // ISO UTC
  end: string; // ISO UTC
}

/** Milliseconds that `timeZone` is offset from UTC at the given instant. */
function tzOffsetMs(timeZone: string, date: Date): number {
  const utc = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
  const local = new Date(date.toLocaleString('en-US', { timeZone }));
  return local.getTime() - utc.getTime();
}

/** Convert a wall-clock time in `timeZone` to the corresponding UTC Date. */
function wallTimeToUtc(
  year: number,
  month: number, // 1-12
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const offset = tzOffsetMs(timeZone, new Date(guess));
  return new Date(guess - offset);
}

/** The weekday (0-6) of a UTC date as observed in `timeZone`. */
function localDayOfWeek(date: Date, timeZone: string): number {
  const local = new Date(date.toLocaleString('en-US', { timeZone }));
  return local.getDay();
}

function parseHhMm(value: string): [number, number] {
  const [h, m] = value.split(':').map((n) => parseInt(n, 10));
  return [h || 0, m || 0];
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Compute open booking slots between `from` and `to` given availability rules
 * and already-booked events. Cancelled events do not block slots.
 */
export function findFreeSlots(
  rules: AvailabilityRule[],
  events: BusyEvent[],
  from: Date,
  to: Date,
  slotMinutesOverride?: number,
): FreeSlot[] {
  const activeRules = rules.filter((r) => r.enabled);
  if (activeRules.length === 0) return [];

  const busy = events
    .filter((e) => e.status !== 'cancelled')
    .map((e) => [new Date(e.startsAt).getTime(), new Date(e.endsAt).getTime()] as const);

  const slots: FreeSlot[] = [];
  const now = Date.now();

  // Walk day by day across the requested window.
  const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  const end = to.getTime();

  // Cap the loop to a sane horizon (60 days) to avoid runaway ranges.
  for (let i = 0; i < 60 && cursor.getTime() <= end; i++) {
    for (const rule of activeRules) {
      // Does this rule apply to the current calendar day in its timezone?
      if (localDayOfWeek(cursor, rule.timezone) !== rule.dayOfWeek) continue;

      // Establish the local Y/M/D as seen in the rule's timezone.
      const localStr = cursor.toLocaleString('en-US', {
        timeZone: rule.timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      const [mm, dd, yyyy] = localStr.split(/[/,]/).map((s) => parseInt(s.trim(), 10));

      const [sh, sm] = parseHhMm(rule.startTime);
      const [eh, em] = parseHhMm(rule.endTime);
      const windowStart = wallTimeToUtc(yyyy, mm, dd, sh, sm, rule.timezone).getTime();
      const windowEnd = wallTimeToUtc(yyyy, mm, dd, eh, em, rule.timezone).getTime();

      const slotMs = (slotMinutesOverride || rule.slotMinutes) * 60_000;
      for (let s = windowStart; s + slotMs <= windowEnd; s += slotMs) {
        const slotEnd = s + slotMs;
        if (s < now) continue; // never offer past slots
        if (s < from.getTime() || slotEnd > end) continue;
        const clash = busy.some(([bs, be]) => overlaps(s, slotEnd, bs, be));
        if (!clash) {
          slots.push({ start: new Date(s).toISOString(), end: new Date(slotEnd).toISOString() });
        }
      }
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  // Sort chronologically and de-dupe identical starts from overlapping rules.
  const seen = new Set<string>();
  return slots
    .sort((a, b) => a.start.localeCompare(b.start))
    .filter((slot) => {
      if (seen.has(slot.start)) return false;
      seen.add(slot.start);
      return true;
    });
}

/** Detect whether a proposed booking clashes with existing events. */
export function hasConflict(events: BusyEvent[], startsAt: string, endsAt: string): boolean {
  const s = new Date(startsAt).getTime();
  const e = new Date(endsAt).getTime();
  return events
    .filter((ev) => ev.status !== 'cancelled')
    .some((ev) => overlaps(s, e, new Date(ev.startsAt).getTime(), new Date(ev.endsAt).getTime()));
}

/** A Google Meet-style placeholder link so bookings always carry a join URL. */
export function generateMeetingUrl(): string {
  const seg = () => Math.random().toString(36).slice(2, 6);
  return `https://meet.iprosper.ai/${seg()}-${seg()}-${seg()}`;
}

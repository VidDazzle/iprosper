/**
 * Scheduling engine for the Chronos booking-calendar add-on.
 *
 * Generates an attorney's open appointment slots from:
 *   1) their availability rules (days, hours, slot length, booking horizon),
 *   2) MINUS busy times from their connected calendar (a private iCal/ICS feed —
 *      Google, Outlook, and Apple all expose one; OAuth free/busy is the
 *      production upgrade), and
 *   3) MINUS consultations already booked on our platform.
 * Only free/busy is ever read — never the contents of their calendar.
 */

export interface Availability {
  /** Days of week the attorney takes appointments (0=Sun … 6=Sat). */
  days: number[];
  startHour: number; // local wall-clock, e.g. 9
  endHour: number; // local wall-clock, e.g. 17
  slotMinutes: number; // e.g. 30
  timezone: string; // IANA, e.g. "America/Chicago"
  horizonDays: number; // how far out clients can book, e.g. 14
  bufferMinutes?: number; // gap kept free around busy events
}

export interface Slot {
  startUtc: string; // ISO
  endUtc: string; // ISO
  label: string; // human label in the attorney's timezone
}

export interface BusyInterval {
  start: number; // epoch ms
  end: number; // epoch ms
}

/** Offset (ms) between a given instant and a timezone's wall clock. */
function tzOffsetMs(instant: number, tz: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const p: Record<string, number> = {};
  for (const part of dtf.formatToParts(new Date(instant))) {
    if (part.type !== "literal") p[part.type] = Number(part.value);
  }
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - instant;
}

/** Convert a wall-clock time in a timezone to a UTC epoch (ms). */
function wallClockToUtc(y: number, mon: number, d: number, h: number, min: number, tz: string): number {
  const guess = Date.UTC(y, mon, d, h, min);
  const off = tzOffsetMs(guess, tz);
  return guess - off;
}

function labelInTz(epoch: number, tz: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz, weekday: "short", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit",
  }).format(new Date(epoch));
}

/** Parse busy intervals from raw ICS text (VEVENT DTSTART/DTEND). */
export function parseIcsBusy(ics: string): BusyInterval[] {
  const out: BusyInterval[] = [];
  const blocks = ics.split(/BEGIN:VEVENT/i).slice(1);
  for (const b of blocks) {
    const start = icsDate(b.match(/DTSTART[^:\n]*:([0-9TZ]+)/i)?.[1]);
    const end = icsDate(b.match(/DTEND[^:\n]*:([0-9TZ]+)/i)?.[1]);
    if (start != null && end != null) out.push({ start, end });
  }
  return out;
}

function icsDate(v?: string): number | null {
  if (!v) return null;
  // Forms: 20260714T143000Z (UTC) or 20260714T143000 (floating) or 20260714 (all-day)
  const m = v.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/);
  if (!m) return null;
  const [, y, mo, d, h = "0", mi = "0", s = "0", z] = m;
  if (z) return Date.UTC(+y, +mo - 1, +d, +h, +mi, +s);
  return new Date(+y, +mo - 1, +d, +h, +mi, +s).getTime(); // floating → treat as local
}

/** Fetch busy intervals from a calendar's private ICS feed. Best-effort. */
export async function fetchIcsBusy(icsUrl?: string): Promise<BusyInterval[]> {
  if (!icsUrl) return [];
  try {
    const url = icsUrl.replace(/^webcal:/i, "https:");
    const res = await fetch(url, { headers: { Accept: "text/calendar" } });
    if (!res.ok) return [];
    return parseIcsBusy(await res.text());
  } catch {
    return [];
  }
}

/** Compute open slots. `busy` and `booked` are epoch-ms intervals. */
export function computeSlots(a: Availability, busy: BusyInterval[], booked: BusyInterval[], now = Date.now()): Slot[] {
  const slots: Slot[] = [];
  const buffer = (a.bufferMinutes ?? 0) * 60_000;
  const blocks = [...busy, ...booked];
  const isFree = (start: number, end: number) =>
    start > now &&
    !blocks.some((b) => start < b.end + buffer && end > b.start - buffer);

  for (let dayOffset = 0; dayOffset <= a.horizonDays; dayOffset++) {
    // Determine the calendar date `dayOffset` days ahead in the attorney's tz.
    const ref = new Date(now + dayOffset * 86_400_000);
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: a.timezone, year: "numeric", month: "2-digit", day: "2-digit", weekday: "short",
    }).formatToParts(ref);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
    const y = +get("year"), mo = +get("month") - 1, d = +get("day");
    const dow = new Date(Date.UTC(y, mo, d)).getUTCDay();
    if (!a.days.includes(dow)) continue;

    for (let h = a.startHour; h < a.endHour; h++) {
      for (let min = 0; min < 60; min += a.slotMinutes) {
        const start = wallClockToUtc(y, mo, d, h, min, a.timezone);
        const end = start + a.slotMinutes * 60_000;
        if (end > wallClockToUtc(y, mo, d, a.endHour, 0, a.timezone)) continue;
        if (isFree(start, end)) {
          slots.push({ startUtc: new Date(start).toISOString(), endUtc: new Date(end).toISOString(), label: labelInTz(start, a.timezone) });
        }
      }
    }
    if (slots.length >= 40) break; // cap what we render
  }
  return slots;
}

/** Generate an RFC-5545 calendar invite for a booked consultation. */
export function generateIcs(opts: {
  uid: string; start: string; end: string; summary: string; description: string;
  organizerEmail: string; attendeeEmail: string; location?: string;
}): string {
  const dt = (iso: string) => iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//X Debt//Chronos//EN", "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${opts.uid}`,
    `DTSTAMP:${dt(new Date().toISOString())}`,
    `DTSTART:${dt(opts.start)}`,
    `DTEND:${dt(opts.end)}`,
    `SUMMARY:${opts.summary}`,
    `DESCRIPTION:${opts.description.replace(/\n/g, "\\n")}`,
    opts.location ? `LOCATION:${opts.location}` : "",
    `ORGANIZER;CN=X Debt:mailto:${opts.organizerEmail}`,
    `ATTENDEE;RSVP=TRUE;CN=Client:mailto:${opts.attendeeEmail}`,
    "STATUS:CONFIRMED",
    "END:VEVENT", "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");
}

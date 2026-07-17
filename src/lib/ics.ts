/** Minimal iCalendar (.ics) generation for calendar events. */

interface IcsEvent {
  id: number | string;
  title: string;
  description?: string | null;
  location?: string | null;
  startsAt: string; // ISO UTC
  endsAt: string; // ISO UTC
  meetingUrl?: string | null;
  organizerEmail?: string | null;
}

function toIcsDate(iso: string): string {
  // UTC basic format: YYYYMMDDTHHMMSSZ
  return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function esc(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function fold(line: string): string {
  // RFC5545: lines SHOULD be <= 75 octets; fold with CRLF + space.
  if (line.length <= 74) return line;
  const parts: string[] = [];
  let s = line;
  while (s.length > 74) {
    parts.push(s.slice(0, 74));
    s = ' ' + s.slice(74);
  }
  parts.push(s);
  return parts.join('\r\n');
}

function vevent(ev: IcsEvent): string {
  const lines = [
    'BEGIN:VEVENT',
    `UID:evolve-${ev.id}@evolve.ai`,
    `DTSTAMP:${toIcsDate(new Date().toISOString())}`,
    `DTSTART:${toIcsDate(ev.startsAt)}`,
    `DTEND:${toIcsDate(ev.endsAt)}`,
    `SUMMARY:${esc(ev.title)}`,
  ];
  const descParts = [ev.description || '', ev.meetingUrl ? `Join: ${ev.meetingUrl}` : ''].filter(Boolean);
  if (descParts.length) lines.push(`DESCRIPTION:${esc(descParts.join('\n'))}`);
  if (ev.location) lines.push(`LOCATION:${esc(ev.location)}`);
  if (ev.meetingUrl) lines.push(`URL:${esc(ev.meetingUrl)}`);
  if (ev.organizerEmail) lines.push(`ORGANIZER:mailto:${ev.organizerEmail}`);
  lines.push('END:VEVENT');
  return lines.map(fold).join('\r\n');
}

export function buildIcs(events: IcsEvent[], calName = 'Evolve Calendar'): string {
  const body = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Evolve//Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${esc(calName)}`,
    ...events.map(vevent),
    'END:VCALENDAR',
  ];
  return body.join('\r\n');
}

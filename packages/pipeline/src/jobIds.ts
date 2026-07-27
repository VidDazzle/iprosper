// Deterministic BullMQ job IDs, shared by closer.ts/nurture.ts (which
// schedule these jobs) and consent.ts (which needs to remove them by
// ID on revocation) — split out to avoid a three-way circular import.
//
// BullMQ only allows a custom jobId to contain ':' if splitting on it
// yields EXACTLY 3 parts (legacy compat for repeatable-job IDs) — any
// other colon count throws "Custom Id cannot contain :". Every ID
// below is deliberately shaped "prefix:leadId:suffix" to satisfy that.

export const NURTURE_DAYS = [2, 5, 9, 13] as const;

export function closerJobId(leadId: string, sequence: number): string {
  return `closer:${leadId}:${sequence}`;
}

export function closerEscalationJobId(leadId: string): string {
  return `closer:${leadId}:escalation`;
}

export function nurtureJobId(leadId: string, day: number): string {
  return `nurture:${leadId}:day${day}`;
}

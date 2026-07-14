/**
 * Audit trail of signed consents. The signed cookie is the portable proof; this
 * store is the server-side record VidDazzle keeps of who accepted the disclosure,
 * which version, and when.
 *
 * Follows the platform's DB-or-in-memory pattern: when TURSO is configured a
 * production build would persist these rows; in dev (and here) we keep them in
 * memory and emit a structured audit log line so there's always a trail. We do
 * NOT store the analyzed documents — only the fact of consent.
 */

export interface ConsentRecord {
  id: string;
  name: string;
  version: string;
  scope: string;
  acks: string[];
  userAgent?: string;
  ip?: string;
  acceptedAt: string; // ISO
}

const mem: ConsentRecord[] = [];

export function recordConsent(input: {
  name: string;
  version: string;
  scope: string;
  acks: string[];
  userAgent?: string;
  ip?: string;
}): ConsentRecord {
  const rec: ConsentRecord = {
    id: `csn_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
    name: input.name,
    version: input.version,
    scope: input.scope,
    acks: input.acks,
    userAgent: input.userAgent,
    ip: input.ip,
    acceptedAt: new Date().toISOString(),
  };
  mem.push(rec);
  // Structured audit line — the durable trail regardless of DB configuration.
  console.info(
    `[consent] accepted id=${rec.id} name=${JSON.stringify(rec.name)} version=${rec.version} scope=${rec.scope} at=${rec.acceptedAt} ip=${rec.ip ?? "?"}`
  );
  return rec;
}

export function consentCount(): number {
  return mem.length;
}

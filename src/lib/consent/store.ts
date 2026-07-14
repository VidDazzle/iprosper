/**
 * Audit trail of signed consents. The signed cookie is the portable proof; this
 * store is the durable server-side record VidDazzle keeps of who accepted the
 * disclosure, which version, and when.
 *
 * Follows the platform's DB-or-in-memory pattern: when TURSO is configured the
 * row is persisted to the consent_records table; otherwise (dev) it's kept in
 * memory. Either way we emit a structured audit log line so there's always a
 * trail. We do NOT store the analyzed documents — only the fact of consent.
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

function hasDb() {
  return Boolean(process.env.TURSO_CONNECTION_URL);
}

export async function recordConsent(input: {
  name: string;
  version: string;
  scope: string;
  acks: string[];
  userAgent?: string;
  ip?: string;
}): Promise<ConsentRecord> {
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

  if (hasDb()) {
    const { db } = await import("@/db");
    const { consentRecords } = await import("@/db/schema");
    await db.insert(consentRecords).values({
      id: rec.id,
      name: rec.name,
      version: rec.version,
      scope: rec.scope,
      acks: JSON.stringify(rec.acks),
      userAgent: rec.userAgent ?? null,
      ip: rec.ip ?? null,
      acceptedAt: rec.acceptedAt,
    });
  } else {
    mem.push(rec);
  }

  // Structured audit line — the trail regardless of DB configuration.
  console.info(
    `[consent] accepted id=${rec.id} name=${JSON.stringify(rec.name)} version=${rec.version} scope=${rec.scope} at=${rec.acceptedAt} ip=${rec.ip ?? "?"} db=${hasDb()}`
  );
  return rec;
}

/** Look up a stored consent record by id (DB when configured, else memory). */
export async function getConsentRecord(id: string): Promise<ConsentRecord | undefined> {
  if (hasDb()) {
    const { db } = await import("@/db");
    const { consentRecords } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    const rows = await db.select().from(consentRecords).where(eq(consentRecords.id, id)).limit(1);
    if (!rows.length) return undefined;
    const r = rows[0];
    return {
      id: r.id, name: r.name, version: r.version, scope: r.scope,
      acks: r.acks ? JSON.parse(r.acks) : [],
      userAgent: r.userAgent ?? undefined, ip: r.ip ?? undefined, acceptedAt: r.acceptedAt,
    };
  }
  return mem.find((r) => r.id === id);
}

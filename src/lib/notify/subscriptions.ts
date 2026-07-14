/** Push-subscription storage. DB when TURSO is set; in-memory otherwise. */

import type { PushSubscription } from "./webpush";

interface StoredSub extends PushSubscription {
  subject: string;
}

const mem: StoredSub[] = [];
const hasDb = () => Boolean(process.env.TURSO_CONNECTION_URL);
const now = () => new Date().toISOString();

export async function saveSubscription(subject: string, sub: PushSubscription): Promise<void> {
  if (hasDb()) {
    const { db } = await import("@/db");
    const { pushSubscriptions } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, sub.endpoint));
    await db.insert(pushSubscriptions).values({
      subject, endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth, createdAt: now(),
    });
    return;
  }
  const i = mem.findIndex((s) => s.endpoint === sub.endpoint);
  if (i >= 0) mem.splice(i, 1);
  mem.push({ subject, ...sub });
}

export async function listForSubject(subject: string): Promise<PushSubscription[]> {
  if (hasDb()) {
    const { db } = await import("@/db");
    const { pushSubscriptions } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    const rows = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.subject, subject));
    return rows.map((r) => ({ endpoint: r.endpoint, p256dh: r.p256dh, auth: r.auth }));
  }
  return mem.filter((s) => s.subject === subject).map(({ endpoint, p256dh, auth }) => ({ endpoint, p256dh, auth }));
}

export async function deleteEndpoint(endpoint: string): Promise<void> {
  if (hasDb()) {
    const { db } = await import("@/db");
    const { pushSubscriptions } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
    return;
  }
  const i = mem.findIndex((s) => s.endpoint === endpoint);
  if (i >= 0) mem.splice(i, 1);
}

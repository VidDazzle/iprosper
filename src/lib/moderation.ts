/**
 * Moderation — the trust-and-safety back office for Orbit Discover. Surfaces
 * abuse reports and background-screening flags for review, and lets a moderator
 * suspend a member. Mutations are admin-gated (see isModerator).
 */

import { db } from '@/db';
import { reports, identityVerifications, lifeProfiles } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { setSuspended } from '@/lib/safety';
import { pushNotification } from '@/lib/notifications';
import type { NextRequest } from 'next/server';

/** Admin gate. If MODERATION_SECRET is set, require it; otherwise allow (dev). */
export function isModerator(request: NextRequest): boolean {
  const secret = process.env.MODERATION_SECRET;
  if (!secret) return true;
  const auth = request.headers.get('authorization');
  const header = request.headers.get('x-moderation-secret');
  return auth === `Bearer ${secret}` || header === secret;
}

async function profileMap(ids: number[]): Promise<Record<number, { name: string; email: string }>> {
  const out: Record<number, { name: string; email: string }> = {};
  for (const id of Array.from(new Set(ids))) {
    const p = (await db.select().from(lifeProfiles).where(eq(lifeProfiles.id, id)).limit(1))[0];
    if (p) out[id] = { name: p.displayName || p.name || p.email, email: p.email };
  }
  return out;
}

export interface ModerationSummary {
  openReports: { id: number; reason: string; detail: string | null; createdAt: string; reporter: string; reported: string; reportedId: number }[];
  screeningFlags: { profileId: number; name: string; flags: string[]; provider: string; at: string | null }[];
  suspended: { profileId: number; name: string; email: string }[];
  counts: { openReports: number; screeningFlags: number; suspended: number };
}

export async function getModerationSummary(): Promise<ModerationSummary> {
  const openReportRows = await db.select().from(reports).where(eq(reports.status, 'open')).orderBy(desc(reports.createdAt));
  const flaggedRows = await db.select().from(identityVerifications).where(eq(identityVerifications.screening, 'flagged'));
  const suspendedRows = await db.select().from(lifeProfiles).where(eq(lifeProfiles.suspended, true));

  const ids = [
    ...openReportRows.flatMap((r) => [r.reporterProfileId, r.reportedProfileId]),
    ...flaggedRows.map((f) => f.profileId),
  ];
  const names = await profileMap(ids);

  return {
    openReports: openReportRows.map((r) => ({
      id: r.id, reason: r.reason, detail: r.detail, createdAt: r.createdAt,
      reporter: names[r.reporterProfileId]?.name || `#${r.reporterProfileId}`,
      reported: names[r.reportedProfileId]?.name || `#${r.reportedProfileId}`,
      reportedId: r.reportedProfileId,
    })),
    screeningFlags: flaggedRows.map((f) => ({
      profileId: f.profileId, name: names[f.profileId]?.name || `#${f.profileId}`,
      flags: f.screeningFlags ? JSON.parse(f.screeningFlags) : [], provider: f.provider, at: f.verifiedAt,
    })),
    suspended: suspendedRows.map((p) => ({ profileId: p.id, name: p.displayName || p.name || p.email, email: p.email })),
    counts: { openReports: openReportRows.length, screeningFlags: flaggedRows.length, suspended: suspendedRows.length },
  };
}

export async function actionReport(id: number, action: 'suspend' | 'dismiss' | 'reviewed'): Promise<void> {
  const rows = await db.select().from(reports).where(eq(reports.id, id)).limit(1);
  const report = rows[0];
  if (!report) return;
  const status = action === 'suspend' ? 'actioned' : action === 'dismiss' ? 'dismissed' : 'reviewed';
  await db.update(reports).set({ status }).where(eq(reports.id, id));
  if (action === 'suspend') {
    await setSuspended(report.reportedProfileId, true);
    await pushNotification(report.reporterProfileId, 'system', 'Thanks for the report', 'We reviewed your report and took action. Thank you for helping keep the community safe.');
  }
}

export async function suspendProfile(profileId: number, on: boolean): Promise<void> {
  await setSuspended(profileId, on);
}

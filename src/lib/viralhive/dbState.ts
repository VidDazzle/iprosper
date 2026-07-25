import { and, desc, eq, gte, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  viralhiveCampaignState,
  viralhiveContentItems,
  viralhiveHandledComments,
  viralhivePostMetrics,
  viralhivePosts,
  viralhiveRunLog,
  viralhiveTimingStats,
} from "@/db/schema";
import type { ContentItem, EngagementSnapshot, PostResult } from "viralhive/config/types";

const MIN_TIMING_SAMPLES = 3;

/**
 * Drizzle/Turso-backed equivalent of the standalone CLI's StateStore
 * (viralhive/src/core/state.ts), reimplemented directly rather than
 * imported — the class holds a private better-sqlite3 handle, so it can't
 * be swapped structurally, and pulling that file in would drag
 * better-sqlite3's native binary into the serverless bundle.
 */

export async function saveContentItem(item: ContentItem) {
  await db
    .insert(viralhiveContentItems)
    .values({
      id: item.id,
      campaignId: item.campaignId,
      payload: JSON.stringify(item),
      status: item.status,
      engagementScore: item.engagementScore ?? null,
      createdAt: item.createdAt,
    })
    .onConflictDoUpdate({
      target: viralhiveContentItems.id,
      set: { payload: JSON.stringify(item), status: item.status, engagementScore: item.engagementScore ?? null },
    });
}

export async function getContentItem(id: string): Promise<ContentItem | undefined> {
  const [row] = await db.select().from(viralhiveContentItems).where(eq(viralhiveContentItems.id, id));
  return row ? (JSON.parse(row.payload) as ContentItem) : undefined;
}

export async function listRecentContent(campaignId: string, limit = 20): Promise<ContentItem[]> {
  const rows = await db
    .select()
    .from(viralhiveContentItems)
    .where(eq(viralhiveContentItems.campaignId, campaignId))
    .orderBy(desc(viralhiveContentItems.createdAt))
    .limit(limit);
  return rows.map((r) => JSON.parse(r.payload) as ContentItem);
}

export async function recordPost(result: PostResult) {
  await db.insert(viralhivePosts).values({
    id: `${result.accountId}:${result.contentItemId}:${result.postedAt}`,
    accountId: result.accountId,
    platform: result.platform,
    contentItemId: result.contentItemId,
    success: result.success,
    remoteId: result.remoteId ?? null,
    remoteUrl: result.remoteUrl ?? null,
    error: result.error ?? null,
    postedAt: result.postedAt,
  });
}

export async function listRecentPosts(limit = 50) {
  return db.select().from(viralhivePosts).orderBy(desc(viralhivePosts.postedAt)).limit(limit);
}

export async function logEvent(level: string, message: string, meta?: unknown) {
  await db.insert(viralhiveRunLog).values({
    level,
    message,
    meta: meta ? JSON.stringify(meta) : null,
    createdAt: new Date().toISOString(),
  });
}

export async function tailLog(limit = 100) {
  return db.select().from(viralhiveRunLog).orderBy(desc(viralhiveRunLog.id)).limit(limit);
}

/** Enforces postsPerDay caps; returns how many posts have gone out today for this campaign+account. */
export async function incrementAndGetDailyCount(campaignId: string, accountId: string): Promise<number> {
  const bucket = new Date().toISOString().slice(0, 10);
  const key = `${campaignId}:${accountId}`;
  const [row] = await db.select().from(viralhiveCampaignState).where(eq(viralhiveCampaignState.campaignId, key));

  const count = row && row.dayBucket === bucket ? row.postsToday + 1 : 1;
  await db
    .insert(viralhiveCampaignState)
    .values({ campaignId: key, postsToday: count, dayBucket: bucket })
    .onConflictDoUpdate({ target: viralhiveCampaignState.campaignId, set: { postsToday: count, dayBucket: bucket } });
  return count;
}

export async function isAutopilotEnabled(campaignId: string, configDefault: boolean): Promise<boolean> {
  const [row] = await db
    .select()
    .from(viralhiveCampaignState)
    .where(eq(viralhiveCampaignState.campaignId, campaignId));
  return row?.autopilotOverride ?? configDefault;
}

export async function setAutopilot(campaignId: string, enabled: boolean) {
  await db
    .insert(viralhiveCampaignState)
    .values({ campaignId, autopilotOverride: enabled })
    .onConflictDoUpdate({ target: viralhiveCampaignState.campaignId, set: { autopilotOverride: enabled } });
}

/** Posts from the last `sinceDays` with a remoteId, for metrics collection / comment polling. */
export async function listPostsForMetricsCollection(sinceDays = 14, limit = 100) {
  const since = new Date(Date.now() - sinceDays * 86_400_000).toISOString();
  const rows = await db
    .select({ post: viralhivePosts, campaignId: viralhiveContentItems.campaignId })
    .from(viralhivePosts)
    .innerJoin(viralhiveContentItems, eq(viralhiveContentItems.id, viralhivePosts.contentItemId))
    .where(
      and(
        eq(viralhivePosts.success, true),
        isNotNull(viralhivePosts.remoteId),
        gte(viralhivePosts.postedAt, since)
      )
    )
    .orderBy(desc(viralhivePosts.postedAt))
    .limit(limit);
  return rows.map((r) => ({ ...r.post, campaignId: r.campaignId }));
}

export function computeEngagementScore(
  s: Pick<EngagementSnapshot, "views" | "likes" | "comments" | "shares" | "clicks" | "newFollowers">
): number {
  const weighted = s.likes + s.comments * 2 + s.shares * 3 + s.clicks * 2 + s.newFollowers * 5;
  return weighted / Math.max(s.views, 1);
}

export async function recordEngagementSnapshot(snapshot: EngagementSnapshot) {
  await db.insert(viralhivePostMetrics).values(snapshot);
}

export async function recordEngagementScoreForContentItem(contentItemId: string, score: number) {
  const item = await getContentItem(contentItemId);
  if (!item) return;
  await saveContentItem({ ...item, engagementScore: score });
}

export async function getTopPerformingTopics(campaignId: string, limit = 5): Promise<string[]> {
  const rows = await db
    .select()
    .from(viralhiveContentItems)
    .where(and(eq(viralhiveContentItems.campaignId, campaignId), isNotNull(viralhiveContentItems.engagementScore)))
    .orderBy(desc(viralhiveContentItems.engagementScore))
    .limit(limit);
  return rows.map((r) => {
    const item = JSON.parse(r.payload) as ContentItem;
    return `${item.brief.topic} (hook: "${item.brief.hook}")`;
  });
}

export async function recordTimingSample(accountId: string, postedAtIso: string, score: number) {
  const postedAt = new Date(postedAtIso);
  const dayOfWeek = postedAt.getDay();
  const hour = postedAt.getHours();
  const [row] = await db
    .select()
    .from(viralhiveTimingStats)
    .where(
      and(
        eq(viralhiveTimingStats.accountId, accountId),
        eq(viralhiveTimingStats.dayOfWeek, dayOfWeek),
        eq(viralhiveTimingStats.hour, hour)
      )
    );

  const sampleCount = (row?.sampleCount ?? 0) + 1;
  const avgScore = row ? row.avgScore + (score - row.avgScore) / sampleCount : score;

  await db
    .insert(viralhiveTimingStats)
    .values({ accountId, dayOfWeek, hour, avgScore, sampleCount })
    .onConflictDoUpdate({
      target: [viralhiveTimingStats.accountId, viralhiveTimingStats.dayOfWeek, viralhiveTimingStats.hour],
      set: { avgScore, sampleCount },
    });
}

export async function getLearnedSlots(accountId: string, count: number): Promise<string[] | undefined> {
  const rows = await db
    .select()
    .from(viralhiveTimingStats)
    .where(and(eq(viralhiveTimingStats.accountId, accountId), gte(viralhiveTimingStats.sampleCount, MIN_TIMING_SAMPLES)))
    .orderBy(desc(viralhiveTimingStats.avgScore))
    .limit(count);
  if (rows.length < count) return undefined;
  return rows.map((r) => `${String(r.hour).padStart(2, "0")}:00`);
}

export async function isCommentHandled(commentId: string): Promise<boolean> {
  const [row] = await db
    .select()
    .from(viralhiveHandledComments)
    .where(eq(viralhiveHandledComments.commentId, commentId));
  return !!row;
}

export async function markCommentHandled(commentId: string) {
  await db
    .insert(viralhiveHandledComments)
    .values({ commentId, handledAt: new Date().toISOString() })
    .onConflictDoNothing();
}

import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import type { ContentItem, EngagementSnapshot, PostResult } from "../config/types.js";

const MIN_TIMING_SAMPLES = 3;

export class StateStore {
  private db: Database.Database;

  constructor(dbPath: string) {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.migrate();
  }

  private migrate() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS content_items (
        id TEXT PRIMARY KEY,
        campaign_id TEXT NOT NULL,
        payload TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS posts (
        id TEXT PRIMARY KEY,
        account_id TEXT NOT NULL,
        platform TEXT NOT NULL,
        content_item_id TEXT NOT NULL,
        success INTEGER NOT NULL,
        remote_id TEXT,
        remote_url TEXT,
        error TEXT,
        posted_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS run_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        level TEXT NOT NULL,
        message TEXT NOT NULL,
        meta TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS campaign_state (
        campaign_id TEXT PRIMARY KEY,
        autopilot INTEGER NOT NULL DEFAULT 0,
        last_run_at TEXT,
        posts_today INTEGER NOT NULL DEFAULT 0,
        day_bucket TEXT
      );

      CREATE TABLE IF NOT EXISTS post_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id TEXT NOT NULL,
        account_id TEXT NOT NULL,
        platform TEXT NOT NULL,
        views INTEGER NOT NULL,
        likes INTEGER NOT NULL,
        comments INTEGER NOT NULL,
        shares INTEGER NOT NULL,
        clicks INTEGER NOT NULL,
        new_followers INTEGER NOT NULL,
        collected_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS timing_stats (
        account_id TEXT NOT NULL,
        day_of_week INTEGER NOT NULL,
        hour INTEGER NOT NULL,
        avg_score REAL NOT NULL DEFAULT 0,
        sample_count INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (account_id, day_of_week, hour)
      );

      CREATE TABLE IF NOT EXISTS handled_comments (
        comment_id TEXT PRIMARY KEY,
        handled_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
  }

  saveContentItem(item: ContentItem) {
    this.db
      .prepare(
        `INSERT INTO content_items (id, campaign_id, payload, status, created_at)
         VALUES (@id, @campaignId, @payload, @status, @createdAt)
         ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, status = excluded.status`
      )
      .run({
        id: item.id,
        campaignId: item.campaignId,
        payload: JSON.stringify(item),
        status: item.status,
        createdAt: item.createdAt,
      });
  }

  getContentItem(id: string): ContentItem | undefined {
    const row = this.db.prepare(`SELECT payload FROM content_items WHERE id = ?`).get(id) as
      | { payload: string }
      | undefined;
    return row ? (JSON.parse(row.payload) as ContentItem) : undefined;
  }

  listRecentContent(campaignId: string, limit = 20): ContentItem[] {
    const rows = this.db
      .prepare(
        `SELECT payload FROM content_items WHERE campaign_id = ? ORDER BY created_at DESC LIMIT ?`
      )
      .all(campaignId, limit) as { payload: string }[];
    return rows.map((r) => JSON.parse(r.payload) as ContentItem);
  }

  recordPost(result: PostResult) {
    this.db
      .prepare(
        `INSERT INTO posts (id, account_id, platform, content_item_id, success, remote_id, remote_url, error, posted_at)
         VALUES (@id, @accountId, @platform, @contentItemId, @success, @remoteId, @remoteUrl, @error, @postedAt)`
      )
      .run({
        id: `${result.accountId}:${result.contentItemId}:${result.postedAt}`,
        accountId: result.accountId,
        platform: result.platform,
        contentItemId: result.contentItemId,
        success: result.success ? 1 : 0,
        remoteId: result.remoteId ?? null,
        remoteUrl: result.remoteUrl ?? null,
        error: result.error ?? null,
        postedAt: result.postedAt,
      });
  }

  listRecentPosts(limit = 50): PostResult[] {
    const rows = this.db
      .prepare(`SELECT * FROM posts ORDER BY posted_at DESC LIMIT ?`)
      .all(limit) as any[];
    return rows.map((r) => ({
      accountId: r.account_id,
      platform: r.platform,
      contentItemId: r.content_item_id,
      success: !!r.success,
      remoteId: r.remote_id ?? undefined,
      remoteUrl: r.remote_url ?? undefined,
      error: r.error ?? undefined,
      postedAt: r.posted_at,
    }));
  }

  log(level: string, message: string, meta?: unknown) {
    this.db
      .prepare(`INSERT INTO run_log (level, message, meta) VALUES (?, ?, ?)`)
      .run(level, message, meta ? JSON.stringify(meta) : null);
  }

  tailLog(limit = 100) {
    return this.db
      .prepare(`SELECT * FROM run_log ORDER BY id DESC LIMIT ?`)
      .all(limit) as any[];
  }

  setAutopilot(campaignId: string, enabled: boolean) {
    this.db
      .prepare(
        `INSERT INTO campaign_state (campaign_id, autopilot) VALUES (?, ?)
         ON CONFLICT(campaign_id) DO UPDATE SET autopilot = excluded.autopilot`
      )
      .run(campaignId, enabled ? 1 : 0);
  }

  isAutopilotEnabled(campaignId: string): boolean {
    const row = this.db
      .prepare(`SELECT autopilot FROM campaign_state WHERE campaign_id = ?`)
      .get(campaignId) as { autopilot: number } | undefined;
    return !!row?.autopilot;
  }

  /** Enforces postsPerDay caps: returns how many posts have gone out today for this campaign+account. */
  incrementAndGetDailyCount(campaignId: string, accountId: string): number {
    const bucket = new Date().toISOString().slice(0, 10);
    const key = `${campaignId}:${accountId}`;
    const row = this.db
      .prepare(`SELECT posts_today, day_bucket FROM campaign_state WHERE campaign_id = ?`)
      .get(key) as { posts_today: number; day_bucket: string } | undefined;

    const count = row && row.day_bucket === bucket ? row.posts_today + 1 : 1;
    this.db
      .prepare(
        `INSERT INTO campaign_state (campaign_id, posts_today, day_bucket) VALUES (?, ?, ?)
         ON CONFLICT(campaign_id) DO UPDATE SET posts_today = excluded.posts_today, day_bucket = excluded.day_bucket`
      )
      .run(key, count, bucket);
    return count;
  }

  /** Posts from the last `sinceDays` that have a remoteId (postable to a metrics API), newest first. */
  listPostsForMetricsCollection(sinceDays = 14, limit = 100): (PostResult & { id: string; campaignId: string })[] {
    const since = new Date(Date.now() - sinceDays * 86_400_000).toISOString();
    const rows = this.db
      .prepare(
        `SELECT posts.*, content_items.campaign_id as campaign_id
         FROM posts
         JOIN content_items ON content_items.id = posts.content_item_id
         WHERE posts.success = 1 AND posts.remote_id IS NOT NULL AND posts.posted_at >= ?
         ORDER BY posts.posted_at DESC LIMIT ?`
      )
      .all(since, limit) as any[];
    return rows.map((r) => ({
      id: r.id,
      campaignId: r.campaign_id,
      accountId: r.account_id,
      platform: r.platform,
      contentItemId: r.content_item_id,
      success: !!r.success,
      remoteId: r.remote_id ?? undefined,
      remoteUrl: r.remote_url ?? undefined,
      error: r.error ?? undefined,
      postedAt: r.posted_at,
    }));
  }

  recordEngagementSnapshot(snapshot: EngagementSnapshot) {
    this.db
      .prepare(
        `INSERT INTO post_metrics (post_id, account_id, platform, views, likes, comments, shares, clicks, new_followers, collected_at)
         VALUES (@postId, @accountId, @platform, @views, @likes, @comments, @shares, @clicks, @newFollowers, @collectedAt)`
      )
      .run(snapshot);
  }

  /** Simple weighted engagement rate used everywhere downstream as "the" score for a post. */
  static computeEngagementScore(s: Pick<EngagementSnapshot, "views" | "likes" | "comments" | "shares" | "clicks" | "newFollowers">): number {
    const weighted = s.likes + s.comments * 2 + s.shares * 3 + s.clicks * 2 + s.newFollowers * 5;
    return weighted / Math.max(s.views, 1);
  }

  recordEngagementScoreForContentItem(contentItemId: string, score: number) {
    const item = this.getContentItem(contentItemId);
    if (!item) return;
    this.saveContentItem({ ...item, engagementScore: score });
  }

  /** Topics/hooks that historically drove the strongest engagement for a campaign — feeds ideation. */
  getTopPerformingTopics(campaignId: string, limit = 5): string[] {
    const rows = this.db
      .prepare(
        `SELECT payload FROM content_items
         WHERE campaign_id = ? AND json_extract(payload, '$.engagementScore') IS NOT NULL
         ORDER BY json_extract(payload, '$.engagementScore') DESC LIMIT ?`
      )
      .all(campaignId, limit) as { payload: string }[];
    return rows.map((r) => {
      const item = JSON.parse(r.payload) as ContentItem;
      return `${item.brief.topic} (hook: "${item.brief.hook}")`;
    });
  }

  /** Incrementally updates the account's day-of-week/hour engagement average with a new sample. */
  recordTimingSample(accountId: string, postedAtIso: string, score: number) {
    const postedAt = new Date(postedAtIso);
    const dayOfWeek = postedAt.getDay();
    const hour = postedAt.getHours();
    const row = this.db
      .prepare(`SELECT avg_score, sample_count FROM timing_stats WHERE account_id = ? AND day_of_week = ? AND hour = ?`)
      .get(accountId, dayOfWeek, hour) as { avg_score: number; sample_count: number } | undefined;

    const sampleCount = (row?.sample_count ?? 0) + 1;
    const avgScore = row ? row.avg_score + (score - row.avg_score) / sampleCount : score;

    this.db
      .prepare(
        `INSERT INTO timing_stats (account_id, day_of_week, hour, avg_score, sample_count) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(account_id, day_of_week, hour) DO UPDATE SET avg_score = excluded.avg_score, sample_count = excluded.sample_count`
      )
      .run(accountId, dayOfWeek, hour, avgScore, sampleCount);
  }

  /** Best learned "HH:mm" slots for an account, or undefined if not enough data yet. */
  getLearnedSlots(accountId: string, count: number): string[] | undefined {
    const rows = this.db
      .prepare(
        `SELECT hour, avg_score, sample_count FROM timing_stats
         WHERE account_id = ? AND sample_count >= ?
         ORDER BY avg_score DESC LIMIT ?`
      )
      .all(accountId, MIN_TIMING_SAMPLES, count) as { hour: number; avg_score: number; sample_count: number }[];
    if (rows.length < count) return undefined;
    return rows.map((r) => `${String(r.hour).padStart(2, "0")}:00`);
  }

  isCommentHandled(commentId: string): boolean {
    return !!this.db.prepare(`SELECT 1 FROM handled_comments WHERE comment_id = ?`).get(commentId);
  }

  markCommentHandled(commentId: string) {
    this.db
      .prepare(`INSERT OR IGNORE INTO handled_comments (comment_id) VALUES (?)`)
      .run(commentId);
  }

  close() {
    this.db.close();
  }
}

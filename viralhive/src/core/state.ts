import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import type { ContentItem, PostResult } from "../config/types.js";

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

  close() {
    this.db.close();
  }
}

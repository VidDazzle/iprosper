CREATE TABLE `viralhive_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`platform` text NOT NULL,
	`display_name` text NOT NULL,
	`credentials_encrypted` text DEFAULT '{}' NOT NULL,
	`niche` text DEFAULT 'general' NOT NULL,
	`posts_per_day` integer DEFAULT 1 NOT NULL,
	`posting_window` text DEFAULT '["09:00"]' NOT NULL,
	`timezone` text DEFAULT 'UTC' NOT NULL,
	`webhook_url` text,
	`enabled` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `viralhive_campaign_state` (
	`campaign_id` text PRIMARY KEY NOT NULL,
	`autopilot_override` integer,
	`posts_today` integer DEFAULT 0 NOT NULL,
	`day_bucket` text
);
--> statement-breakpoint
CREATE TABLE `viralhive_campaigns` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`niche` text NOT NULL,
	`goal` text NOT NULL,
	`tone_keywords` text DEFAULT '[]' NOT NULL,
	`banned_topics` text DEFAULT '[]' NOT NULL,
	`account_ids` text DEFAULT '[]' NOT NULL,
	`script_provider_ids` text NOT NULL,
	`video_provider_ids` text NOT NULL,
	`image_provider_id` text,
	`voice_provider_id` text,
	`virality_provider_id` text,
	`quality_threshold` real DEFAULT 9.2 NOT NULL,
	`max_regeneration_attempts` integer DEFAULT 4 NOT NULL,
	`video_length_seconds` integer DEFAULT 30 NOT NULL,
	`autopilot` integer DEFAULT true NOT NULL,
	`smart_scheduling` integer DEFAULT true NOT NULL,
	`engagement_auto_reply` integer DEFAULT true NOT NULL,
	`product_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `viralhive_content_items` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_id` text NOT NULL,
	`payload` text NOT NULL,
	`status` text NOT NULL,
	`engagement_score` real,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `viralhive_handled_comments` (
	`comment_id` text PRIMARY KEY NOT NULL,
	`handled_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `viralhive_post_metrics` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`post_id` text NOT NULL,
	`account_id` text NOT NULL,
	`platform` text NOT NULL,
	`views` integer DEFAULT 0 NOT NULL,
	`likes` integer DEFAULT 0 NOT NULL,
	`comments` integer DEFAULT 0 NOT NULL,
	`shares` integer DEFAULT 0 NOT NULL,
	`clicks` integer DEFAULT 0 NOT NULL,
	`new_followers` integer DEFAULT 0 NOT NULL,
	`collected_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `viralhive_posts` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`platform` text NOT NULL,
	`content_item_id` text NOT NULL,
	`success` integer NOT NULL,
	`remote_id` text,
	`remote_url` text,
	`error` text,
	`posted_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `viralhive_products` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`price_cents` integer DEFAULT 0 NOT NULL,
	`currency` text DEFAULT 'usd' NOT NULL,
	`image_urls` text DEFAULT '[]' NOT NULL,
	`stripe_price_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `viralhive_providers` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`base_url` text,
	`model` text,
	`api_key_encrypted` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `viralhive_run_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`level` text NOT NULL,
	`message` text NOT NULL,
	`meta` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `viralhive_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `viralhive_timing_stats` (
	`account_id` text NOT NULL,
	`day_of_week` integer NOT NULL,
	`hour` integer NOT NULL,
	`avg_score` real DEFAULT 0 NOT NULL,
	`sample_count` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`account_id`, `day_of_week`, `hour`)
);

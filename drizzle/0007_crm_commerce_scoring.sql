CREATE TABLE IF NOT EXISTS `pipelines` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`is_default` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `pipeline_stages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`pipeline_id` integer NOT NULL,
	`name` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`kind` text DEFAULT 'open' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `deals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`pipeline_id` integer NOT NULL,
	`stage_id` integer NOT NULL,
	`title` text NOT NULL,
	`value_cents` integer DEFAULT 0 NOT NULL,
	`contact_name` text,
	`contact_email` text,
	`contact_phone` text,
	`company` text,
	`source` text,
	`notes` text,
	`status` text DEFAULT 'open' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `leads` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`email` text,
	`phone` text,
	`company` text,
	`source` text,
	`message` text,
	`status` text DEFAULT 'new' NOT NULL,
	`deal_id` integer,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `products` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`price_cents` integer DEFAULT 0 NOT NULL,
	`currency` text DEFAULT 'usd' NOT NULL,
	`image_url` text,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `orders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_id` integer NOT NULL,
	`buyer_name` text,
	`buyer_email` text,
	`amount_cents` integer NOT NULL,
	`currency` text DEFAULT 'usd' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`provider` text DEFAULT 'manual' NOT NULL,
	`provider_ref` text,
	`source_context` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `work_scores` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`target_type` text NOT NULL,
	`target_id` integer NOT NULL,
	`score` integer NOT NULL,
	`reviewer_name` text,
	`reviewer_email` text,
	`comment` text,
	`category` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_deals_stage` ON `deals` (`stage_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_pipeline_stages_pipeline` ON `pipeline_stages` (`pipeline_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_products_slug` ON `products` (`slug`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_orders_product` ON `orders` (`product_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_work_scores_target` ON `work_scores` (`target_type`,`target_id`);

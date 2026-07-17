CREATE TABLE IF NOT EXISTS `billing_accounts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text,
	`email` text,
	`is_primary` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `plans` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product` text NOT NULL,
	`tier` text NOT NULL,
	`name` text NOT NULL,
	`monthly_price_cents` integer NOT NULL,
	`included_units` integer NOT NULL,
	`unit_label` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `product_subscriptions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`account_id` integer NOT NULL,
	`product` text NOT NULL,
	`tier` text NOT NULL,
	`included_units` integer NOT NULL,
	`used_units` integer DEFAULT 0 NOT NULL,
	`extra_credits` integer DEFAULT 0 NOT NULL,
	`period_start` text NOT NULL,
	`period_end` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `usage_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`account_id` integer NOT NULL,
	`product` text NOT NULL,
	`kind` text NOT NULL,
	`units` integer NOT NULL,
	`cost_cents` integer NOT NULL,
	`price_cents` integer NOT NULL,
	`source` text DEFAULT 'included' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_plans_product` ON `plans` (`product`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_subs_account` ON `product_subscriptions` (`account_id`,`product`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_usage_account` ON `usage_events` (`account_id`,`product`);

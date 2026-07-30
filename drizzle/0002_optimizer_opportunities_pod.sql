ALTER TABLE `products` ADD `priority_score` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `auto_managed` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `image_url` text;--> statement-breakpoint
ALTER TABLE `products` ADD `pod_provider` text;--> statement-breakpoint
ALTER TABLE `products` ADD `pod_external_id` text;--> statement-breakpoint
CREATE INDEX `products_priority_idx` ON `products` (`priority_score`);--> statement-breakpoint
CREATE TABLE `opportunities` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kind` text NOT NULL,
	`name` text NOT NULL,
	`url` text,
	`network` text,
	`category` text,
	`description` text,
	`rationale` text,
	`est_revenue_low_usd` real,
	`est_revenue_high_usd` real,
	`effort_level` text,
	`score` real DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'discovered' NOT NULL,
	`source` text DEFAULT 'discovery' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `opportunities_status_idx` ON `opportunities` (`status`);--> statement-breakpoint
CREATE INDEX `opportunities_score_idx` ON `opportunities` (`score`);--> statement-breakpoint
CREATE TABLE `pod_designs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`image_url` text NOT NULL,
	`source_prompt` text,
	`provider` text,
	`created_at` text NOT NULL
);

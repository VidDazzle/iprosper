ALTER TABLE `meeting_assets` ADD COLUMN `url` text;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `deliverables` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`public_id` text NOT NULL,
	`title` text NOT NULL,
	`client_name` text,
	`client_email` text,
	`project_type` text DEFAULT 'other' NOT NULL,
	`message` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`delivered_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `deliverable_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`deliverable_id` integer NOT NULL,
	`kind` text DEFAULT 'file' NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`url` text,
	`mime_type` text,
	`size_bytes` integer,
	`storage_key` text,
	`upload_id` text,
	`status` text DEFAULT 'ready' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `deliverable_reviews` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`deliverable_id` integer NOT NULL,
	`item_id` integer,
	`reviewer_name` text NOT NULL,
	`reviewer_email` text,
	`decision` text NOT NULL,
	`revision_detail` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_deliverables_public` ON `deliverables` (`public_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_deliverable_items_deliverable` ON `deliverable_items` (`deliverable_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_deliverable_reviews_deliverable` ON `deliverable_reviews` (`deliverable_id`);

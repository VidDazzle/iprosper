-- Evolve Hub: in-app notification center + in-app chat, tying every module
-- together so people don't have to rely on external channels alone.

CREATE TABLE IF NOT EXISTS `notifications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`profile_id` integer NOT NULL,
	`type` text DEFAULT 'general' NOT NULL,
	`title` text NOT NULL,
	`body` text,
	`link` text,
	`read_at` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `dm_messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`from_profile_id` integer NOT NULL,
	`to_profile_id` integer NOT NULL,
	`body` text NOT NULL,
	`read_at` text,
	`created_at` text NOT NULL
);

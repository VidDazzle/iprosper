-- Evolve Life: personal AI concierge (health, workouts, entertainment, food,
-- activities) with cross-domain reminders over the channel the person chooses.

CREATE TABLE IF NOT EXISTS `life_profiles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`name` text,
	`city` text,
	`home_lat` real,
	`home_lng` real,
	`timezone` text DEFAULT 'America/New_York' NOT NULL,
	`reminder_channel` text DEFAULT 'email' NOT NULL,
	`phone` text,
	`push_endpoint` text,
	`quiet_hours_start` text,
	`quiet_hours_end` text,
	`onboarded` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `life_profiles_email_unique` ON `life_profiles` (`email`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `life_preferences` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`profile_id` integer NOT NULL,
	`category` text NOT NULL,
	`value` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `life_pref_unique` ON `life_preferences` (`profile_id`,`category`,`value`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `life_intents` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`profile_id` integer NOT NULL,
	`raw_text` text NOT NULL,
	`category` text NOT NULL,
	`suggestions` text,
	`chosen` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `life_reminders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`profile_id` integer NOT NULL,
	`title` text NOT NULL,
	`detail` text,
	`category` text DEFAULT 'personal' NOT NULL,
	`when_at` text NOT NULL,
	`channel` text DEFAULT 'inherit' NOT NULL,
	`recurrence` text DEFAULT 'none' NOT NULL,
	`status` text DEFAULT 'scheduled' NOT NULL,
	`sent_at` text,
	`created_at` text NOT NULL
);

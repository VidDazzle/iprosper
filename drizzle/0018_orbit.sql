-- Orbit — the personal life calendar, SEPARATE from the business "Evolve"
-- calendar (calendar_events). Personal-life features (Life, Fitness, Together,
-- Discover, reminders) use this. If the owner also subscribes to Evolve, Orbit
-- can optionally sync with the business calendar (evolve_event_id links a mirror).

CREATE TABLE IF NOT EXISTS `personal_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`profile_id` integer NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`location` text,
	`starts_at` text NOT NULL,
	`ends_at` text NOT NULL,
	`timezone` text DEFAULT 'America/New_York' NOT NULL,
	`all_day` integer DEFAULT false NOT NULL,
	`category` text DEFAULT 'personal' NOT NULL,
	`color` text,
	`source` text DEFAULT 'manual' NOT NULL,
	`reminder_minutes` integer,
	`reminder_sent` integer DEFAULT false NOT NULL,
	`evolve_event_id` integer,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
-- Whether the owner has turned on syncing Orbit <-> the Evolve business calendar.
ALTER TABLE `life_profiles` ADD COLUMN `sync_evolve` integer DEFAULT false NOT NULL;

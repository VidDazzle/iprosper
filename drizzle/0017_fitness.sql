-- Evolve Fitness tracker: measurable goals + a log of accomplishments
-- (workouts, runs, weigh-ins, steps…), tied to the person's Life profile.

CREATE TABLE IF NOT EXISTS `fitness_goals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`profile_id` integer NOT NULL,
	`kind` text NOT NULL,
	`label` text NOT NULL,
	`target_value` real NOT NULL,
	`baseline_value` real,
	`unit` text,
	`deadline` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`achieved_at` text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `fitness_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`profile_id` integer NOT NULL,
	`kind` text NOT NULL,
	`label` text,
	`value` real,
	`unit` text,
	`note` text,
	`logged_at` text NOT NULL,
	`created_at` text NOT NULL
);

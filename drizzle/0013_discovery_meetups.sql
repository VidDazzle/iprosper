-- After a mutual match, each person may OPT IN to share their phone number and
-- request a time to meet. Phone sharing is per-person and independent (each
-- controls their own); a number is visible to the other only once shared AND
-- the two are matched.

ALTER TABLE `taps` ADD COLUMN `shared_phone` integer DEFAULT false NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `meetup_requests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`from_profile_id` integer NOT NULL,
	`to_profile_id` integer NOT NULL,
	`when_at` text NOT NULL,
	`note` text,
	`status` text DEFAULT 'proposed' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);

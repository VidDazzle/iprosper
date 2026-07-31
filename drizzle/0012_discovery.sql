-- Evolve Discover: opt-in, interest-matched, radius-based discovery of other
-- people nearby. Privacy-first: a member's exact coordinates are NEVER exposed
-- to others — only a coarse distance and shared interests. A member's photo is
-- revealed to another person only when they "tap" (express interest in) them;
-- mutual taps are a match and both are notified.

ALTER TABLE `life_profiles` ADD COLUMN `discoverable` integer DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE `life_profiles` ADD COLUMN `discovery_radius_miles` integer DEFAULT 5 NOT NULL;
--> statement-breakpoint
ALTER TABLE `life_profiles` ADD COLUMN `discovery_photo_url` text;
--> statement-breakpoint
ALTER TABLE `life_profiles` ADD COLUMN `display_name` text;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `taps` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`from_profile_id` integer NOT NULL,
	`to_profile_id` integer NOT NULL,
	`message` text,
	`matched` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `taps_pair_unique` ON `taps` (`from_profile_id`,`to_profile_id`);

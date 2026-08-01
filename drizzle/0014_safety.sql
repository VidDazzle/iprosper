-- Safety controls for Evolve Discover: 18+ gate (from the identity check),
-- block / report, and the data behind unmatch.

-- Age assurance comes from the KYC provider's verified date of birth. We store
-- only the boolean, never the DOB itself.
ALTER TABLE `identity_verifications` ADD COLUMN `adult` integer DEFAULT false NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `blocks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`blocker_profile_id` integer NOT NULL,
	`blocked_profile_id` integer NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `blocks_pair_unique` ON `blocks` (`blocker_profile_id`,`blocked_profile_id`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `reports` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`reporter_profile_id` integer NOT NULL,
	`reported_profile_id` integer NOT NULL,
	`reason` text NOT NULL,
	`detail` text,
	`status` text DEFAULT 'open' NOT NULL,
	`created_at` text NOT NULL
);

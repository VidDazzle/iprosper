-- Evolve Together: two connected people (separate locations) share calendars +
-- location, plan dates by mutual availability with a propose/accept/counter
-- loop, and share private photos gated behind identity verification.

-- Attribute events + presence to a person.
ALTER TABLE `calendar_events` ADD COLUMN `owner_profile_id` integer;
--> statement-breakpoint
ALTER TABLE `life_profiles` ADD COLUMN `last_lat` real;
--> statement-breakpoint
ALTER TABLE `life_profiles` ADD COLUMN `last_lng` real;
--> statement-breakpoint
ALTER TABLE `life_profiles` ADD COLUMN `last_location_at` text;
--> statement-breakpoint
ALTER TABLE `life_profiles` ADD COLUMN `share_location` integer DEFAULT true NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `connections` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`inviter_profile_id` integer NOT NULL,
	`invitee_email` text NOT NULL,
	`invitee_profile_id` integer,
	`status` text DEFAULT 'pending' NOT NULL,
	`share_location` integer DEFAULT true NOT NULL,
	`share_calendar` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `date_proposals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`connection_id` integer NOT NULL,
	`from_profile_id` integer NOT NULL,
	`parent_id` integer,
	`activity` text NOT NULL,
	`location` text,
	`starts_at` text NOT NULL,
	`ends_at` text NOT NULL,
	`note` text,
	`status` text DEFAULT 'proposed' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
-- Only the verification STATUS is stored here. The driver's license image and
-- the selfie/face match are handled by the KYC provider and are NEVER stored in
-- our database.
CREATE TABLE IF NOT EXISTS `identity_verifications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`profile_id` integer NOT NULL,
	`provider` text DEFAULT 'none' NOT NULL,
	`session_id` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`method` text DEFAULT 'document+selfie' NOT NULL,
	`created_at` text NOT NULL,
	`verified_at` text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `shared_photos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`connection_id` integer NOT NULL,
	`owner_profile_id` integer NOT NULL,
	`storage_key` text,
	`url` text,
	`caption` text,
	`revealed` integer DEFAULT false NOT NULL,
	`reveal_requested` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL
);

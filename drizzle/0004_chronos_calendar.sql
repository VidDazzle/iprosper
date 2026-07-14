ALTER TABLE `attorney_partners` ADD `calendar_enabled` integer DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE `attorney_partners` ADD `calendar_provider` text;
--> statement-breakpoint
ALTER TABLE `attorney_partners` ADD `busy_ics_url` text;
--> statement-breakpoint
ALTER TABLE `attorney_partners` ADD `timezone` text DEFAULT 'America/New_York';
--> statement-breakpoint
ALTER TABLE `attorney_partners` ADD `availability` text;
--> statement-breakpoint
CREATE TABLE `attorney_appointments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`partner_id` integer NOT NULL,
	`client_name` text NOT NULL,
	`client_email` text NOT NULL,
	`client_phone` text,
	`topic` text,
	`start_utc` text NOT NULL,
	`end_utc` text NOT NULL,
	`status` text DEFAULT 'booked' NOT NULL,
	`fee_amount` integer,
	`created_at` text NOT NULL
);

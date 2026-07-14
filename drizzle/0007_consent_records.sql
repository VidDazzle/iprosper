CREATE TABLE `consent_records` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`version` text NOT NULL,
	`scope` text DEFAULT 'advocate' NOT NULL,
	`acks` text NOT NULL,
	`user_agent` text,
	`ip` text,
	`accepted_at` text NOT NULL
);

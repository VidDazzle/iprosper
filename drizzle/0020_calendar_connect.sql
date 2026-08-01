-- External calendar connections for Orbit. A person can link their existing
-- Google Calendar or Microsoft Outlook/365 calendar so Orbit sees those events
-- as "busy" (availability-aware planning) and can optionally push Orbit events
-- back out. OAuth tokens are stored SEALED (AES-GCM via MAIL_ENCRYPTION_KEY)
-- when encryption is configured; only the tokens + the account email are kept,
-- never the remote calendar's contents.

CREATE TABLE IF NOT EXISTS `calendar_connections` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`profile_id` integer NOT NULL,
	`provider` text NOT NULL,                       -- google | microsoft
	`account_email` text,
	`access_token` text,                            -- sealed
	`refresh_token` text,                           -- sealed
	`expires_at` text,                              -- ISO, when the access token expires
	`scope` text,
	`calendar_id` text DEFAULT 'primary' NOT NULL,  -- which calendar to read/write
	`sync_inbound` integer DEFAULT true NOT NULL,   -- import their events as busy
	`sync_outbound` integer DEFAULT false NOT NULL, -- push Orbit events to their calendar
	`status` text DEFAULT 'active' NOT NULL,        -- active | error | revoked
	`last_synced_at` text,
	`last_error` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `cal_conn_profile_idx` ON `calendar_connections` (`profile_id`);

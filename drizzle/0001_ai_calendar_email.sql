CREATE TABLE IF NOT EXISTS `calendar_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`location` text,
	`starts_at` text NOT NULL,
	`ends_at` text NOT NULL,
	`timezone` text DEFAULT 'America/New_York' NOT NULL,
	`status` text DEFAULT 'scheduled' NOT NULL,
	`attendees` text,
	`organizer_email` text,
	`meeting_url` text,
	`source` text DEFAULT 'manual' NOT NULL,
	`agent_notes` text,
	`reminder_minutes` integer,
	`reminder_sent` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `availability_rules` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`day_of_week` integer NOT NULL,
	`start_time` text NOT NULL,
	`end_time` text NOT NULL,
	`timezone` text DEFAULT 'America/New_York' NOT NULL,
	`slot_minutes` integer DEFAULT 30 NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `mail_messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`thread_id` text NOT NULL,
	`direction` text NOT NULL,
	`from_email` text NOT NULL,
	`to_emails` text NOT NULL,
	`cc_emails` text,
	`subject_encrypted` text NOT NULL,
	`body_encrypted` text NOT NULL,
	`preview` text,
	`status` text DEFAULT 'unread' NOT NULL,
	`starred` integer DEFAULT false NOT NULL,
	`priority` text DEFAULT 'normal' NOT NULL,
	`category` text,
	`source` text DEFAULT 'manual' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `mail_contacts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`company` text,
	`phone` text,
	`notes` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `voice_agent_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`action` text NOT NULL,
	`params` text,
	`result` text,
	`status` text DEFAULT 'ok' NOT NULL,
	`call_id` text,
	`caller_number` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_calendar_events_starts_at` ON `calendar_events` (`starts_at`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_mail_messages_thread` ON `mail_messages` (`thread_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_mail_messages_status` ON `mail_messages` (`status`);

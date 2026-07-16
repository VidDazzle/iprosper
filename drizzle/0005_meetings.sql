CREATE TABLE IF NOT EXISTS `meetings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`room_code` text NOT NULL,
	`title` text NOT NULL,
	`host_name` text,
	`host_email` text,
	`status` text DEFAULT 'scheduled' NOT NULL,
	`calendar_event_id` integer,
	`recording_offered` integer DEFAULT true NOT NULL,
	`transcription_offered` integer DEFAULT true NOT NULL,
	`summary_offered` integer DEFAULT true NOT NULL,
	`started_at` text,
	`ended_at` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `meeting_participants` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`meeting_id` integer NOT NULL,
	`name` text NOT NULL,
	`email` text,
	`role` text DEFAULT 'participant' NOT NULL,
	`consent_recording` integer DEFAULT false NOT NULL,
	`consent_transcription` integer DEFAULT false NOT NULL,
	`consent_summary` integer DEFAULT false NOT NULL,
	`consent_reports` integer DEFAULT false NOT NULL,
	`consent_decided_at` text,
	`consent_ip` text,
	`joined_at` text,
	`left_at` text,
	`is_active` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `meeting_assets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`meeting_id` integer NOT NULL,
	`kind` text DEFAULT 'image' NOT NULL,
	`title` text NOT NULL,
	`mime_type` text,
	`size_bytes` integer,
	`storage_key` text,
	`upload_id` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`uploaded_by_name` text,
	`uploaded_by_email` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `asset_reviews` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`asset_id` integer NOT NULL,
	`revision` integer NOT NULL,
	`reviewer_name` text NOT NULL,
	`reviewer_email` text,
	`decision` text DEFAULT 'pending' NOT NULL,
	`notes` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `meeting_transcript_lines` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`meeting_id` integer NOT NULL,
	`participant_name` text,
	`text` text NOT NULL,
	`at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `meeting_artifacts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`meeting_id` integer NOT NULL,
	`kind` text NOT NULL,
	`content` text,
	`storage_key` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `meeting_signals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`meeting_id` integer NOT NULL,
	`from_peer` text NOT NULL,
	`to_peer` text,
	`kind` text NOT NULL,
	`payload` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_meetings_room_code` ON `meetings` (`room_code`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_meeting_participants_meeting` ON `meeting_participants` (`meeting_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_meeting_assets_meeting` ON `meeting_assets` (`meeting_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_asset_reviews_asset` ON `asset_reviews` (`asset_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_meeting_signals_meeting` ON `meeting_signals` (`meeting_id`,`id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_meeting_transcript_meeting` ON `meeting_transcript_lines` (`meeting_id`);

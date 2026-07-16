CREATE TABLE IF NOT EXISTS `mail_attachments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`message_id` integer,
	`thread_id` text,
	`filename` text NOT NULL,
	`mime_type` text DEFAULT 'application/octet-stream' NOT NULL,
	`size_bytes` integer NOT NULL,
	`storage_provider` text DEFAULT 's3' NOT NULL,
	`storage_key` text NOT NULL,
	`upload_id` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`wrapped_key` text,
	`checksum` text,
	`created_at` text NOT NULL,
	`uploaded_at` text
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_mail_attachments_message` ON `mail_attachments` (`message_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_mail_attachments_status` ON `mail_attachments` (`status`);

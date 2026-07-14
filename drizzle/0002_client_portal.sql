CREATE TABLE `client_users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`name` text NOT NULL,
	`phone` text,
	`ops_client_id` text,
	`notify_email` integer DEFAULT true NOT NULL,
	`notify_sms` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`last_login_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `client_users_email_unique` ON `client_users` (`email`);
--> statement-breakpoint
CREATE TABLE `client_documents` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`client_id` text NOT NULL,
	`file_name` text NOT NULL,
	`mime_type` text,
	`size_bytes` integer,
	`declared_type` text,
	`analyzed_type` text,
	`analyzed_agent` text,
	`findings` text,
	`recommended_action` text,
	`priority` text DEFAULT 'normal' NOT NULL,
	`status` text DEFAULT 'analyzing' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `client_approvals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`client_id` text NOT NULL,
	`agent` text NOT NULL,
	`title` text NOT NULL,
	`detail` text NOT NULL,
	`amount` integer,
	`creditor` text,
	`document_id` integer,
	`status` text DEFAULT 'pending' NOT NULL,
	`channels_sent` text,
	`decided_at` text,
	`decided_via` text,
	`expires_at` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `client_notifications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`client_id` text NOT NULL,
	`message` text NOT NULL,
	`href` text,
	`read` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL
);

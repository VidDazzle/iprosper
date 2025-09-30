CREATE TABLE `email_captures` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`password_attempt` text NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`created_at` text NOT NULL
);

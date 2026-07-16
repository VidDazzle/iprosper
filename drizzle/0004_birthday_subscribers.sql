CREATE TABLE IF NOT EXISTS `birthday_subscribers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text,
	`birthdate` text NOT NULL,
	`birth_month` integer NOT NULL,
	`birth_day` integer NOT NULL,
	`last_greeted_year` integer,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_birthday_month_day` ON `birthday_subscribers` (`birth_month`,`birth_day`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_birthday_email` ON `birthday_subscribers` (`email`);

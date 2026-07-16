CREATE TABLE IF NOT EXISTS `maintenance_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kind` text NOT NULL,
	`status` text DEFAULT 'ok' NOT NULL,
	`health_score` integer,
	`security_score` integer,
	`findings` text,
	`remediations` text,
	`recommendations` text,
	`applied` integer DEFAULT false NOT NULL,
	`duration_ms` integer,
	`trigger` text DEFAULT 'manual' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_maintenance_runs_created` ON `maintenance_runs` (`created_at`);

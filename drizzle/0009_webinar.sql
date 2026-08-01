ALTER TABLE `meetings` ADD COLUMN `is_webinar` integer DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE `meetings` ADD COLUMN `pinned_cta_url` text;
--> statement-breakpoint
ALTER TABLE `meetings` ADD COLUMN `pinned_cta_label` text;

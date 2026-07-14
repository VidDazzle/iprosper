ALTER TABLE `attorney_partners` ADD `background_check_consent` integer DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE `attorney_partners` ADD `advertiser_agreement_version` text;
--> statement-breakpoint
ALTER TABLE `attorney_partners` ADD `advertiser_agreed_at` text;

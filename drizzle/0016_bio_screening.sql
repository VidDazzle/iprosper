-- Short bio for Discover profiles, and a background-screening gate to keep the
-- platform safe (sex-offender registry + criminal watchlist screening). Only
-- the screening OUTCOME is stored here — never the underlying records.

ALTER TABLE `life_profiles` ADD COLUMN `bio` text;
--> statement-breakpoint
-- unscreened | pending | clear | flagged
ALTER TABLE `identity_verifications` ADD COLUMN `screening` text DEFAULT 'unscreened' NOT NULL;
--> statement-breakpoint
-- JSON array of flagged categories (e.g. ["sex_offense"]). No record details.
ALTER TABLE `identity_verifications` ADD COLUMN `screening_flags` text;

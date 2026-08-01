-- Moderation: the ability to suspend a member (removes them from Discover and
-- blocks eligibility). Reports + screening flags are reviewed against this.
ALTER TABLE `life_profiles` ADD COLUMN `suspended` integer DEFAULT false NOT NULL;

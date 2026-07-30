CREATE TABLE `connectors` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`platform` text NOT NULL,
	`display_name` text NOT NULL,
	`account_handle` text,
	`external_account_id` text,
	`status` text DEFAULT 'disconnected' NOT NULL,
	`policy_block_reason` text,
	`scopes` text,
	`credential_ref` text,
	`token_expires_at` text,
	`last_polled_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `connectors_platform_idx` ON `connectors` (`platform`);
--> statement-breakpoint
CREATE TABLE `term_rules` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`expression` text NOT NULL,
	`platform` text,
	`campaign` text,
	`enabled` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `term_rules_enabled_idx` ON `term_rules` (`enabled`);
--> statement-breakpoint
CREATE TABLE `mentions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`platform` text NOT NULL,
	`connector_id` integer,
	`external_id` text NOT NULL,
	`permalink` text,
	`author_handle` text,
	`author_external_id` text,
	`content` text NOT NULL,
	`lang` text,
	`posted_at` text,
	`matched_rule_id` integer,
	`status` text DEFAULT 'new' NOT NULL,
	`captured_at` text NOT NULL,
	FOREIGN KEY (`connector_id`) REFERENCES `connectors`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`matched_rule_id`) REFERENCES `term_rules`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `mentions_platform_external_idx` ON `mentions` (`platform`,`external_id`);
--> statement-breakpoint
CREATE INDEX `mentions_status_idx` ON `mentions` (`status`);
--> statement-breakpoint
CREATE TABLE `intent_signals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`mention_id` integer NOT NULL,
	`buying_intent` real DEFAULT 0 NOT NULL,
	`urgency` real DEFAULT 0 NOT NULL,
	`pain_point` text,
	`sentiment` text,
	`crisis_flag` integer DEFAULT false NOT NULL,
	`budget_signal` text,
	`model` text,
	`rationale` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`mention_id`) REFERENCES `mentions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `intent_signals_mention_idx` ON `intent_signals` (`mention_id`);
--> statement-breakpoint
CREATE TABLE `prospects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`platform` text NOT NULL,
	`author_handle` text,
	`author_external_id` text NOT NULL,
	`score` real DEFAULT 0 NOT NULL,
	`top_pain_point` text,
	`status` text DEFAULT 'queued' NOT NULL,
	`jurisdiction` text,
	`cooldown_until` text,
	`last_contacted_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `prospects_identity_idx` ON `prospects` (`platform`,`author_external_id`);
--> statement-breakpoint
CREATE INDEX `prospects_status_score_idx` ON `prospects` (`status`,`score`);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source` text NOT NULL,
	`external_id` text,
	`title` text NOT NULL,
	`description` text,
	`category` text,
	`price_usd` real,
	`supplier_cost_usd` real,
	`margin_pct` real,
	`ship_days_min` integer,
	`ship_days_max` integer,
	`review_score` real,
	`review_count` integer,
	`affiliate_network` text,
	`affiliate_payout_usd` real,
	`affiliate_url` text,
	`landing_url` text,
	`embedding` text,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `products_source_idx` ON `products` (`source`);
--> statement-breakpoint
CREATE INDEX `products_active_idx` ON `products` (`active`);
--> statement-breakpoint
CREATE TABLE `outreach_messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`prospect_id` integer NOT NULL,
	`product_id` integer,
	`connector_id` integer,
	`mention_id` integer,
	`channel` text DEFAULT 'public_reply' NOT NULL,
	`draft_body` text NOT NULL,
	`disclosure_text` text,
	`template_variant` text,
	`status` text DEFAULT 'pending_review' NOT NULL,
	`reviewed_by` text,
	`rejection_reason` text,
	`external_message_id` text,
	`send_error` text,
	`attribution_tag` text,
	`scheduled_for` text,
	`sent_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`prospect_id`) REFERENCES `prospects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`connector_id`) REFERENCES `connectors`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`mention_id`) REFERENCES `mentions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `outreach_status_idx` ON `outreach_messages` (`status`);
--> statement-breakpoint
CREATE INDEX `outreach_prospect_idx` ON `outreach_messages` (`prospect_id`);
--> statement-breakpoint
CREATE TABLE `suppression_list` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`platform` text,
	`author_handle` text,
	`author_external_id` text,
	`reason` text,
	`source` text DEFAULT 'manual' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `suppression_identity_idx` ON `suppression_list` (`platform`,`author_external_id`);
--> statement-breakpoint
CREATE INDEX `suppression_handle_idx` ON `suppression_list` (`author_handle`);
--> statement-breakpoint
CREATE TABLE `outreach_outcomes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`outreach_id` integer NOT NULL,
	`outcome` text NOT NULL,
	`revenue_usd` real,
	`detail` text,
	`occurred_at` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`outreach_id`) REFERENCES `outreach_messages`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `outcomes_outreach_idx` ON `outreach_outcomes` (`outreach_id`);
--> statement-breakpoint
CREATE INDEX `outcomes_outcome_idx` ON `outreach_outcomes` (`outcome`);
--> statement-breakpoint
CREATE TABLE `audit_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`actor` text,
	`action` text NOT NULL,
	`entity_type` text,
	`entity_id` integer,
	`detail` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `audit_action_idx` ON `audit_log` (`action`);

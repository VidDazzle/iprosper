CREATE TABLE `attorney_partners` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`firm_name` text NOT NULL,
	`attorney_name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text,
	`website` text,
	`bar_number` text,
	`state_code` text,
	`practice_areas` text,
	`bio` text,
	`photo_type` text,
	`photo_url` text,
	`business_card_url` text,
	`business_card_generated` integer DEFAULT false NOT NULL,
	`tier` text DEFAULT 'featured' NOT NULL,
	`setup_fee_paid` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `attorney_leads` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`partner_id` integer NOT NULL,
	`client_ref` text,
	`channel` text NOT NULL,
	`practice_area` text,
	`billing_model` text DEFAULT 'per_lead' NOT NULL,
	`fee_amount` integer,
	`status` text DEFAULT 'delivered' NOT NULL,
	`created_at` text NOT NULL
);

CREATE TABLE `photo_candidates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`model` text NOT NULL,
	`year` text NOT NULL,
	`color_id` text NOT NULL,
	`color_name` text NOT NULL,
	`source_kind` text DEFAULT 'community-upload' NOT NULL,
	`object_key` text NOT NULL,
	`original_url` text,
	`file_name` text NOT NULL,
	`content_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`credit` text NOT NULL,
	`license` text NOT NULL,
	`status` text DEFAULT 'staged' NOT NULL,
	`sha256` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `photo_candidates_object_key_unique` ON `photo_candidates` (`object_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `photo_candidates_sha256_unique` ON `photo_candidates` (`sha256`);--> statement-breakpoint
CREATE TABLE `photo_review_selections` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`model` text NOT NULL,
	`year` text NOT NULL,
	`color_id` text NOT NULL,
	`candidate_ids_json` text NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`processed_at` text
);

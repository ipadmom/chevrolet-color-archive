CREATE TABLE `photo_upload_receipts` (
	`receipt_hash` text PRIMARY KEY NOT NULL,
	`candidate_id` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`consumed_at` text,
	FOREIGN KEY (`candidate_id`) REFERENCES `photo_candidates`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `photo_upload_receipts_candidate` ON `photo_upload_receipts` (`candidate_id`);--> statement-breakpoint
CREATE TABLE `submission_rate_limits` (
	`fingerprint` text NOT NULL,
	`action` text NOT NULL,
	`window_started_at` integer NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`fingerprint`, `action`)
);
--> statement-breakpoint
PRAGMA defer_foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_photo_candidates` (
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
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "photo_candidates_status_check" CHECK("__new_photo_candidates"."status" IN ('staged', 'approved', 'published', 'rejected'))
);
--> statement-breakpoint
INSERT INTO `__new_photo_candidates`("id", "model", "year", "color_id", "color_name", "source_kind", "object_key", "original_url", "file_name", "content_type", "size_bytes", "credit", "license", "status", "sha256", "created_at") SELECT "id", "model", "year", "color_id", "color_name", "source_kind", "object_key", "original_url", "file_name", "content_type", "size_bytes", "credit", "license", "status", "sha256", "created_at" FROM `photo_candidates`;--> statement-breakpoint
DROP TABLE `photo_candidates`;--> statement-breakpoint
ALTER TABLE `__new_photo_candidates` RENAME TO `photo_candidates`;--> statement-breakpoint
PRAGMA defer_foreign_keys=OFF;--> statement-breakpoint
CREATE UNIQUE INDEX `photo_candidates_object_key_unique` ON `photo_candidates` (`object_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `photo_candidates_context_sha_unique` ON `photo_candidates` (`model`,`year`,`color_id`,`sha256`);--> statement-breakpoint
CREATE INDEX `photo_candidates_public_lookup` ON `photo_candidates` (`model`,`year`,`color_id`,`status`,`id`);--> statement-breakpoint
CREATE TABLE `__new_photo_review_selections` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`model` text NOT NULL,
	`year` text NOT NULL,
	`color_id` text NOT NULL,
	`candidate_ids_json` text NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`attempt_count` integer DEFAULT 0 NOT NULL,
	`lease_token_hash` text,
	`lease_expires_at` text,
	`last_error` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`processed_at` text,
	CONSTRAINT "photo_review_selections_status_check" CHECK("__new_photo_review_selections"."status" IN ('queued', 'leased', 'processed', 'failed'))
);
--> statement-breakpoint
INSERT INTO `__new_photo_review_selections`("id", "model", "year", "color_id", "candidate_ids_json", "status", "created_at", "processed_at") SELECT "id", "model", "year", "color_id", "candidate_ids_json", "status", "created_at", "processed_at" FROM `photo_review_selections`;--> statement-breakpoint
DROP TABLE `photo_review_selections`;--> statement-breakpoint
ALTER TABLE `__new_photo_review_selections` RENAME TO `photo_review_selections`;--> statement-breakpoint
CREATE INDEX `photo_review_selections_queue` ON `photo_review_selections` (`status`,`lease_expires_at`,`id`);

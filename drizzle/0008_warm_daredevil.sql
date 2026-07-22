DROP INDEX `photo_review_selections_active_unique`;--> statement-breakpoint
ALTER TABLE `photo_review_selections` ADD `archived_candidate_ids_json` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `photo_review_selections` ADD `archived_selection_receipt_json` text;--> statement-breakpoint
ALTER TABLE `photo_review_selections` ADD `archived_selection_receipt_sha256` text;--> statement-breakpoint
CREATE UNIQUE INDEX `photo_review_selections_active_unique` ON `photo_review_selections` (`model`,`year`,`color_id`,`candidate_ids_json`,`archived_candidate_ids_json`) WHERE "photo_review_selections"."status" != 'failed';
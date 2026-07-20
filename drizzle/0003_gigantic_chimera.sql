ALTER TABLE `photo_candidates` ADD `rejected_at` text;--> statement-breakpoint
ALTER TABLE `photo_candidates` ADD `object_purged_at` text;--> statement-breakpoint
CREATE INDEX `photo_candidates_retention` ON `photo_candidates` (`status`,`object_purged_at`,`created_at`,`id`);--> statement-breakpoint
ALTER TABLE `photo_review_selections` ADD `last_error_code` text;--> statement-breakpoint
UPDATE `photo_review_selections`
SET
	`status` = 'failed',
	`lease_token_hash` = NULL,
	`lease_expires_at` = NULL,
	`last_error_code` = 'duplicate_active_selection_migrated'
WHERE `status` != 'failed'
	AND EXISTS (
		SELECT 1
		FROM `photo_review_selections` AS `preferred`
		WHERE `preferred`.`model` = `photo_review_selections`.`model`
			AND `preferred`.`year` = `photo_review_selections`.`year`
			AND `preferred`.`color_id` = `photo_review_selections`.`color_id`
			AND `preferred`.`candidate_ids_json` = `photo_review_selections`.`candidate_ids_json`
			AND `preferred`.`status` != 'failed'
			AND (
				CASE `preferred`.`status`
					WHEN 'processed' THEN 3
					WHEN 'leased' THEN 2
					ELSE 1
				END
				>
				CASE `photo_review_selections`.`status`
					WHEN 'processed' THEN 3
					WHEN 'leased' THEN 2
					ELSE 1
				END
				OR (
					`preferred`.`status` = `photo_review_selections`.`status`
					AND `preferred`.`id` < `photo_review_selections`.`id`
				)
			)
	);--> statement-breakpoint
CREATE UNIQUE INDEX `photo_review_selections_active_unique` ON `photo_review_selections` (`model`,`year`,`color_id`,`candidate_ids_json`) WHERE "photo_review_selections"."status" != 'failed';

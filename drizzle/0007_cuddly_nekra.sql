ALTER TABLE `photo_candidates` ADD `published_asset_bytes` integer;--> statement-breakpoint
ALTER TABLE `photo_candidates` ADD `published_release_tag` text;--> statement-breakpoint
ALTER TABLE `photo_candidates` ADD `published_asset_name` text;--> statement-breakpoint
ALTER TABLE `photo_candidates` ADD `published_asset_url` text;--> statement-breakpoint
ALTER TABLE `photo_candidates` ADD `published_attribution_name` text;--> statement-breakpoint
ALTER TABLE `photo_candidates` ADD `published_attribution_url` text;--> statement-breakpoint
ALTER TABLE `photo_candidates` ADD `published_attribution_sha256` text;--> statement-breakpoint
ALTER TABLE `photo_candidates` ADD `published_attribution_bytes` integer;
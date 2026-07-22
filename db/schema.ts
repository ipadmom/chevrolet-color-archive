import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const photoCandidates = sqliteTable(
  "photo_candidates",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    model: text("model").notNull(),
    year: text("year").notNull(),
    colorId: text("color_id").notNull(),
    colorName: text("color_name").notNull(),
    sourceKind: text("source_kind").notNull().default("community-upload"),
    objectKey: text("object_key").notNull().unique(),
    originalUrl: text("original_url"),
    fileName: text("file_name").notNull(),
    contentType: text("content_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    credit: text("credit").notNull(),
    license: text("license").notNull(),
    status: text("status").notNull().default("staged"),
    sha256: text("sha256").notNull(),
    publishedSha256: text("published_sha256"),
    publishedAssetBytes: integer("published_asset_bytes"),
    publishedReleaseTag: text("published_release_tag"),
    publishedAssetName: text("published_asset_name"),
    publishedAssetUrl: text("published_asset_url"),
    publishedAttributionName: text("published_attribution_name"),
    publishedAttributionUrl: text("published_attribution_url"),
    publishedAttributionSha256: text("published_attribution_sha256"),
    publishedAttributionBytes: integer("published_attribution_bytes"),
    // Retained for pre-Release migration audit only. New publications leave it null.
    publishedAssetPath: text("published_asset_path"),
    publishedAt: text("published_at"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    rejectedAt: text("rejected_at"),
    objectPurgedAt: text("object_purged_at"),
  },
  (table) => [
    uniqueIndex("photo_candidates_context_sha_unique").on(
      table.model,
      table.year,
      table.colorId,
      table.sha256,
    ),
    index("photo_candidates_public_lookup").on(
      table.model,
      table.year,
      table.colorId,
      table.status,
      table.id,
    ),
    index("photo_candidates_context_page").on(
      table.model,
      table.year,
      table.colorId,
      table.id,
    ),
    index("photo_candidates_retention").on(
      table.status,
      table.objectPurgedAt,
      table.createdAt,
      table.id,
    ),
    check(
      "photo_candidates_status_check",
      sql`${table.status} IN ('staged', 'approved', 'published', 'rejected')`,
    ),
  ],
);

export const photoUploadReceipts = sqliteTable(
  "photo_upload_receipts",
  {
    receiptHash: text("receipt_hash").primaryKey(),
    candidateId: integer("candidate_id")
      .notNull()
      .references(() => photoCandidates.id, { onDelete: "cascade" }),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    consumedAt: text("consumed_at"),
  },
  (table) => [
    index("photo_upload_receipts_candidate").on(table.candidateId),
    index("photo_upload_receipts_retention").on(
      table.createdAt,
      table.receiptHash,
    ),
  ],
);

export const photoReviewSelections = sqliteTable(
  "photo_review_selections",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    model: text("model").notNull(),
    year: text("year").notNull(),
    colorId: text("color_id").notNull(),
    candidateIdsJson: text("candidate_ids_json").notNull(),
    archivedCandidateIdsJson: text("archived_candidate_ids_json")
      .notNull()
      .default("[]"),
    archivedSelectionReceiptJson: text("archived_selection_receipt_json"),
    archivedSelectionReceiptSha256: text(
      "archived_selection_receipt_sha256",
    ),
    status: text("status").notNull().default("queued"),
    attemptCount: integer("attempt_count").notNull().default(0),
    leaseTokenHash: text("lease_token_hash"),
    leaseExpiresAt: text("lease_expires_at"),
    lastErrorCode: text("last_error_code"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    processedAt: text("processed_at"),
  },
  (table) => [
    index("photo_review_selections_queue").on(
      table.status,
      table.leaseExpiresAt,
      table.id,
    ),
    index("photo_review_selections_status_page").on(table.status, table.id),
    uniqueIndex("photo_review_selections_active_unique")
      .on(
        table.model,
        table.year,
        table.colorId,
        table.candidateIdsJson,
        table.archivedCandidateIdsJson,
      )
      .where(sql`${table.status} != 'failed'`),
    check(
      "photo_review_selections_status_check",
      sql`${table.status} IN ('queued', 'leased', 'processed', 'failed')`,
    ),
  ],
);

export const submissionRateLimits = sqliteTable(
  "submission_rate_limits",
  {
    fingerprint: text("fingerprint").notNull(),
    action: text("action").notNull(),
    windowStartedAt: integer("window_started_at").notNull(),
    count: integer("count").notNull().default(0),
  },
  (table) => [
    primaryKey({
      columns: [table.fingerprint, table.action],
      name: "submission_rate_limits_pk",
    }),
  ],
);

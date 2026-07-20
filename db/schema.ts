import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const photoCandidates = sqliteTable("photo_candidates", {
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
  sha256: text("sha256").notNull().unique(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const photoReviewSelections = sqliteTable("photo_review_selections", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  model: text("model").notNull(),
  year: text("year").notNull(),
  colorId: text("color_id").notNull(),
  candidateIdsJson: text("candidate_ids_json").notNull(),
  status: text("status").notNull().default("queued"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  processedAt: text("processed_at"),
});

export const MAX_UPLOAD_BYTES: number;
export const MAX_MULTIPART_BYTES: number;
export const MAX_CANDIDATES_PER_SELECTION: number;
export const UPLOAD_RECEIPT_TTL_SECONDS: number;
export const PUBLISHED_RELEASE_TAG: "community-photo-archive-v1";
export const PUBLISHED_RELEASE_DOWNLOAD_BASE: "https://github.com/ipadmom/chevrolet-color-archive/releases/download/community-photo-archive-v1";
export const PUBLIC_PHOTO_STATUSES: readonly ["published"];
export const QUEUE_STATUSES: readonly [
  "queued",
  "leased",
  "processed",
  "failed",
];
export const QUEUE_ERROR_CODES: readonly [
  "lease_expired_max_attempts",
  "duplicate_active_selection_migrated",
  "claim_hydration_failed",
  "claim_not_in_review",
  "approval_metadata_invalid",
  "rights_review_rejected",
  "publication_pre_push_failed",
  "publication_pre_release_failed",
  "candidate_state_update_failed",
  "publisher_retry",
];
export const ALLOWED_RIGHTS: readonly [
  "Permission granted for archive use",
  "CC BY 4.0",
  "CC BY-SA 4.0",
  "Public domain",
  "Rights review required",
];

type Availability = Record<string, unknown>;
type SecurityColor = {
  id: string;
  name: string;
  availability: Availability;
};
type SecurityGeneration = {
  years: string[];
  colors: SecurityColor[];
};
type SecurityModel = {
  id: string;
  name: string;
  generations: SecurityGeneration[];
};
export type ArchiveContext = {
  model: string;
  modelName: string;
  year: string;
  colorId: string;
  colorName: string;
};
export type PublishedAssetMapping = {
  candidateId: number;
  publishedSha256: string;
  publishedBytes: number;
  releaseTag: string;
  publishedAssetName: string;
  publishedAssetUrl: string;
  attributionAssetName: string;
  attributionAssetUrl: string;
  attributionSha256: string;
  attributionBytes: number;
};

export function resolveArchiveContext(
  models: SecurityModel[],
  rawModel: unknown,
  rawYear: unknown,
  rawColorId: unknown,
): ArchiveContext | null;
export function normalizeCredit(value: unknown): string | null;
export function normalizeRights(value: unknown): string | null;
export function sanitizeFileName(value: unknown): string;
export function detectImageMime(
  bytes: Uint8Array | ArrayBuffer,
): "image/jpeg" | "image/png" | "image/gif" | "image/webp" | null;
export function isReceiptToken(value: unknown): value is string;
export function isPublicPhotoStatus(
  value: unknown,
): value is "published";
export function publishedAssetExtension(
  contentType: unknown,
): "jpg" | "png" | "gif" | "webp" | null;
export function publishedAssetUrl(
  publishedSha256: unknown,
  releaseTag: unknown,
  publishedAssetName: unknown,
  storedAssetUrl: unknown,
  contentType: unknown,
): string | null;
export function publishedAttributionUrl(
  candidateId: unknown,
  publishedSha256: unknown,
  releaseTag: unknown,
  attributionAssetName: unknown,
  storedAttributionUrl: unknown,
): string | null;
export function parsePublishedAssetMappings(
  value: unknown,
): PublishedAssetMapping[] | null;
export function isQueueStatus(
  value: unknown,
): value is "queued" | "leased" | "processed" | "failed";
export function isQueueErrorCode(
  value: unknown,
): value is
  | "lease_expired_max_attempts"
  | "duplicate_active_selection_migrated"
  | "claim_hydration_failed"
  | "claim_not_in_review"
  | "approval_metadata_invalid"
  | "rights_review_rejected"
  | "publication_pre_push_failed"
  | "publication_pre_release_failed"
  | "candidate_state_update_failed"
  | "publisher_retry";
export function parseBoundedInteger(
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number,
): number;
export function sha256Hex(
  value: string | Uint8Array | ArrayBuffer,
): Promise<string>;
export function createOpaqueToken(): string;
export function bearerMatches(
  request: Request,
  expectedToken: string | undefined,
): Promise<boolean>;

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const MAX_MULTIPART_BYTES = MAX_UPLOAD_BYTES + 64 * 1024;
export const MAX_CANDIDATES_PER_SELECTION = 20;
export const MAX_ARCHIVE_COLOR_ID_LENGTH = 160;
export const UPLOAD_RECEIPT_TTL_SECONDS = 24 * 60 * 60;
export const PUBLISHED_RELEASE_TAG = "community-photo-archive-v1";
export const PUBLISHED_RELEASE_DOWNLOAD_BASE =
  "https://github.com/ipadmom/chevrolet-color-archive/releases/download/community-photo-archive-v1";
export const PUBLIC_PHOTO_STATUSES = Object.freeze(["published"]);
export const QUEUE_STATUSES = Object.freeze([
  "queued",
  "leased",
  "processed",
  "failed",
]);
export const QUEUE_ERROR_CODES = Object.freeze([
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
]);
export const ALLOWED_RIGHTS = Object.freeze([
  "Permission granted for archive use",
  "CC BY 4.0",
  "CC BY-SA 4.0",
  "Public domain",
  "Rights review required",
]);

const RECEIPT_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/;
const MAX_PUBLISHED_ASSET_BYTES = 25 * 1024 * 1024;
const MAX_ATTRIBUTION_ASSET_BYTES = 512 * 1024;

export function resolveArchiveContext(models, rawModel, rawYear, rawColorId) {
  const modelId = cleanIdentifier(rawModel, 48);
  const year = cleanIdentifier(rawYear, 4);
  const colorId = cleanIdentifier(rawColorId, MAX_ARCHIVE_COLOR_ID_LENGTH);
  if (!modelId || !/^\d{4}$/.test(year) || !colorId) return null;

  const model = models.find((entry) => entry.id === modelId);
  if (!model) return null;
  const matchingColors = model.generations
    .filter((entry) => entry.years.includes(year))
    .flatMap((entry) =>
      entry.colors.filter(
        (color) => color.id === colorId && color.availability[year],
      ),
    );
  if (matchingColors.length !== 1) return null;
  const [color] = matchingColors;

  return {
    model: model.id,
    modelName: model.name,
    year,
    colorId: color.id,
    colorName: color.name,
  };
}

export function normalizeCredit(value) {
  const rawCredit = String(value ?? "");
  if (CONTROL_CHARACTER_PATTERN.test(rawCredit)) return null;
  const credit = rawCredit.trim().replace(/\s+/g, " ");
  if (
    credit.length < 1 ||
    credit.length > 160
  ) {
    return null;
  }
  return credit;
}

export function normalizeRights(value) {
  const rights = String(value ?? "").trim();
  return ALLOWED_RIGHTS.includes(rights) ? rights : null;
}

export function sanitizeFileName(value) {
  return (
    String(value ?? "")
      .normalize("NFKD")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 120) || "photo"
  );
}

export function detectImageMime(bytes) {
  const view =
    bytes instanceof Uint8Array
      ? bytes
      : new Uint8Array(bytes instanceof ArrayBuffer ? bytes : []);
  if (
    view.length >= 3 &&
    view[0] === 0xff &&
    view[1] === 0xd8 &&
    view[2] === 0xff
  ) {
    return "image/jpeg";
  }
  if (
    view.length >= 8 &&
    view[0] === 0x89 &&
    view[1] === 0x50 &&
    view[2] === 0x4e &&
    view[3] === 0x47 &&
    view[4] === 0x0d &&
    view[5] === 0x0a &&
    view[6] === 0x1a &&
    view[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    view.length >= 6 &&
    view[0] === 0x47 &&
    view[1] === 0x49 &&
    view[2] === 0x46 &&
    view[3] === 0x38 &&
    (view[4] === 0x37 || view[4] === 0x39) &&
    view[5] === 0x61
  ) {
    return "image/gif";
  }
  if (
    view.length >= 12 &&
    view[0] === 0x52 &&
    view[1] === 0x49 &&
    view[2] === 0x46 &&
    view[3] === 0x46 &&
    view[8] === 0x57 &&
    view[9] === 0x45 &&
    view[10] === 0x42 &&
    view[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

export function isReceiptToken(value) {
  return typeof value === "string" && RECEIPT_PATTERN.test(value);
}

export function isPublicPhotoStatus(value) {
  return PUBLIC_PHOTO_STATUSES.includes(value);
}

export function publishedAssetExtension(contentType) {
  if (contentType === "image/jpeg") return "jpg";
  if (contentType === "image/png") return "png";
  if (contentType === "image/gif") return "gif";
  if (contentType === "image/webp") return "webp";
  return null;
}

export function publishedAssetUrl(
  publishedSha256,
  releaseTag,
  publishedAssetName,
  storedAssetUrl,
  contentType,
) {
  const extension = publishedAssetExtension(contentType);
  if (
    !extension ||
    typeof publishedSha256 !== "string" ||
    !/^[a-f0-9]{64}$/.test(publishedSha256)
  ) {
    return null;
  }
  const expectedName = `${publishedSha256}.${extension}`;
  const expectedUrl = `${PUBLISHED_RELEASE_DOWNLOAD_BASE}/${expectedName}`;
  if (
    releaseTag !== PUBLISHED_RELEASE_TAG ||
    publishedAssetName !== expectedName ||
    storedAssetUrl !== expectedUrl
  ) {
    return null;
  }
  return expectedUrl;
}

export function publishedAttributionUrl(
  candidateId,
  publishedSha256,
  releaseTag,
  attributionAssetName,
  storedAttributionUrl,
) {
  if (
    !Number.isSafeInteger(candidateId) ||
    candidateId < 1 ||
    typeof publishedSha256 !== "string" ||
    !/^[a-f0-9]{64}$/.test(publishedSha256) ||
    releaseTag !== PUBLISHED_RELEASE_TAG ||
    typeof attributionAssetName !== "string" ||
    !new RegExp(
      `^publication-[1-9][0-9]*-${candidateId}-${publishedSha256}\\.json$`,
    ).test(attributionAssetName)
  ) {
    return null;
  }
  const expectedUrl =
    `${PUBLISHED_RELEASE_DOWNLOAD_BASE}/${attributionAssetName}`;
  return storedAttributionUrl === expectedUrl ? expectedUrl : null;
}

export function parsePublishedAssetMappings(value) {
  if (value === undefined) return [];
  if (
    !Array.isArray(value) ||
    value.length > MAX_CANDIDATES_PER_SELECTION
  ) {
    return null;
  }
  const mappings = [];
  const candidateIds = new Set();
  for (const entry of value) {
    const prototype =
      entry && typeof entry === "object"
        ? Object.getPrototypeOf(entry)
        : undefined;
    if (
      !entry ||
      typeof entry !== "object" ||
      Array.isArray(entry) ||
      (prototype !== Object.prototype && prototype !== null) ||
      Object.keys(entry).sort().join(",") !==
        [
          "attributionAssetName",
          "attributionAssetUrl",
          "attributionBytes",
          "attributionSha256",
          "candidateId",
          "publishedAssetName",
          "publishedAssetUrl",
          "publishedBytes",
          "publishedSha256",
          "releaseTag",
        ].sort().join(",")
    ) {
      return null;
    }
    const {
      candidateId,
      publishedSha256,
      publishedBytes,
      releaseTag,
      publishedAssetName,
      publishedAssetUrl,
      attributionAssetName,
      attributionAssetUrl,
      attributionSha256,
      attributionBytes,
    } = entry;
    const extension = publishedAssetName?.split(".").at(-1);
    if (
      typeof candidateId !== "number" ||
      !Number.isSafeInteger(candidateId) ||
      candidateId < 1 ||
      candidateIds.has(candidateId) ||
      typeof publishedSha256 !== "string" ||
      !/^[a-f0-9]{64}$/.test(publishedSha256) ||
      !Number.isSafeInteger(publishedBytes) ||
      publishedBytes < 1 ||
      publishedBytes > MAX_PUBLISHED_ASSET_BYTES ||
      releaseTag !== PUBLISHED_RELEASE_TAG ||
      publishedAssetName !== `${publishedSha256}.${extension}` ||
      !/^(?:jpg|png|gif|webp)$/.test(extension) ||
      publishedAssetUrl !==
        `${PUBLISHED_RELEASE_DOWNLOAD_BASE}/${publishedAssetName}` ||
      typeof attributionAssetName !== "string" ||
      !new RegExp(
        `^publication-[1-9][0-9]*-${candidateId}-${publishedSha256}\\.json$`,
      ).test(attributionAssetName) ||
      attributionAssetUrl !==
        `${PUBLISHED_RELEASE_DOWNLOAD_BASE}/${attributionAssetName}` ||
      typeof attributionSha256 !== "string" ||
      !/^[a-f0-9]{64}$/.test(attributionSha256) ||
      !Number.isSafeInteger(attributionBytes) ||
      attributionBytes < 1 ||
      attributionBytes > MAX_ATTRIBUTION_ASSET_BYTES
    ) {
      return null;
    }
    candidateIds.add(candidateId);
    mappings.push({
      candidateId,
      publishedSha256,
      publishedBytes,
      releaseTag,
      publishedAssetName,
      publishedAssetUrl,
      attributionAssetName,
      attributionAssetUrl,
      attributionSha256,
      attributionBytes,
    });
  }
  return mappings;
}

export function isQueueStatus(value) {
  return QUEUE_STATUSES.includes(value);
}

export function isQueueErrorCode(value) {
  return QUEUE_ERROR_CODES.includes(value);
}

export function parseBoundedInteger(value, fallback, minimum, maximum) {
  if (value === null || value === undefined || value === "") return fallback;
  if (!/^\d+$/.test(String(value))) return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, parsed));
}

export async function sha256Hex(value) {
  const bytes =
    typeof value === "string"
      ? new TextEncoder().encode(value)
      : value instanceof Uint8Array
        ? value
        : new Uint8Array(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export function createOpaqueToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export async function bearerMatches(request, expectedToken) {
  if (!expectedToken) return false;
  const header = request.headers.get("authorization") ?? "";
  if (!header.startsWith("Bearer ")) return false;
  const supplied = header.slice(7);
  const [suppliedHash, expectedHash] = await Promise.all([
    sha256Hex(supplied),
    sha256Hex(expectedToken),
  ]);
  let difference = suppliedHash.length ^ expectedHash.length;
  const length = Math.max(suppliedHash.length, expectedHash.length);
  for (let index = 0; index < length; index += 1) {
    difference |=
      (suppliedHash.charCodeAt(index) || 0) ^
      (expectedHash.charCodeAt(index) || 0);
  }
  return difference === 0;
}

function cleanIdentifier(value, maxLength) {
  const result = String(value ?? "").trim();
  if (
    result.length < 1 ||
    result.length > maxLength ||
    !/^[a-z0-9-]+$/i.test(result)
  ) {
    return "";
  }
  return result;
}

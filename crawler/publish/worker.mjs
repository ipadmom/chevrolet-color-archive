import { createHash, randomUUID } from "node:crypto";
import {
  mkdir,
  open,
  readFile,
  rename,
  stat,
  unlink,
} from "node:fs/promises";
import path from "node:path";
import { posix } from "node:path";

import { sanitizeImageForPublication } from "./image-sanitizer.mjs";

export const PUBLICATION_SCHEMA_VERSION = 3;
export const DEFAULT_ASSET_ROOT = "public/vehicle-photos";
export const DEFAULT_MAX_ASSET_BYTES = 25 * 1024 * 1024;
export const DEFAULT_LEASE_SECONDS = 1800;
export const QUEUE_ACK_ERROR_CODES = Object.freeze([
  "claim_hydration_failed",
  "claim_not_in_review",
  "approval_metadata_invalid",
  "rights_review_rejected",
  "publication_pre_push_failed",
  "publisher_retry",
]);

const ATTRIBUTION_SCHEMA_VERSION = 2;
const QUEUE_ACK_ERROR_CODE_SET = new Set(QUEUE_ACK_ERROR_CODES);

const MIME_EXTENSIONS = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/gif", "gif"],
  ["image/webp", "webp"],
]);

function assertPlainObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be a JSON object.`);
  }
  return value;
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

export function assertNoCredentialMaterial(
  value,
  { knownSecrets = [] } = {},
) {
  const serialized = JSON.stringify(value);
  for (const secret of knownSecrets) {
    if (
      typeof secret === "string" &&
      secret.length >= 8 &&
      serialized.includes(secret)
    ) {
      throw new Error("Credential material is forbidden in publication metadata.");
    }
  }
  if (
    /(?:gh[pousr]_|github_pat_)[A-Za-z0-9_]{12,}/i.test(serialized) ||
    /Bearer\s+[A-Za-z0-9._~-]{12,}/i.test(serialized) ||
    /(?<![A-Za-z0-9_-])[A-Za-z0-9_-]{43}(?![A-Za-z0-9_-])/.test(serialized)
  ) {
    throw new Error("Credential-shaped material is forbidden in publication metadata.");
  }
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, canonicalize(child)]),
    );
  }
  return value;
}

export function stableStringify(value) {
  return `${JSON.stringify(canonicalize(value), null, 2)}\n`;
}

export function normalizeSitesBaseUrl(rawValue) {
  const value = String(rawValue ?? "").trim();
  if (!value) throw new Error("SITES_BASE_URL is required.");

  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("SITES_BASE_URL must be a valid URL.");
  }

  if (url.username || url.password) {
    throw new Error("SITES_BASE_URL must not contain credentials.");
  }
  const isLocal =
    url.hostname === "localhost" ||
    url.hostname === "127.0.0.1" ||
    url.hostname === "[::1]" ||
    url.hostname === "::1";
  if (url.protocol !== "https:" && !(url.protocol === "http:" && isLocal)) {
    throw new Error("SITES_BASE_URL must use HTTPS, except for local offline tests.");
  }

  url.search = "";
  url.hash = "";
  url.pathname = url.pathname.replace(/\/+$/, "");
  return url.toString().replace(/\/+$/, "");
}

function apiUrl(baseUrl, route, searchParams = undefined) {
  const url = new URL(`${normalizeSitesBaseUrl(baseUrl)}/${route.replace(/^\/+/, "")}`);
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      url.searchParams.set(key, String(value));
    }
  }
  return url;
}

function requireQueueToken(value) {
  if (typeof value !== "string" || !value) {
    throw new Error("PUBLISH_QUEUE_TOKEN is required.");
  }
  return value;
}

async function fetchQueueJson(
  url,
  {
    queueToken,
    fetchImpl,
    method = "GET",
    body = undefined,
  },
) {
  const token = requireQueueToken(queueToken);
  const response = await fetchImpl(url, {
    method,
    headers: {
      accept: "application/json",
      authorization: `Bearer ${token}`,
      ...(body === undefined ? {} : { "content-type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    throw new Error(`Sites request failed with HTTP ${response.status} at ${url.pathname}.`);
  }
  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error(`Sites returned invalid JSON at ${url.pathname}.`);
  }
  return payload;
}

function validateSelection(raw, expectedStatuses = new Set(["queued"])) {
  const hydrated = cloneJson(assertPlainObject(raw, "Selection"));
  const rawCandidates = hydrated.candidates;
  delete hydrated.candidates;
  const selection = hydrated;
  if (!Number.isInteger(selection.id) || selection.id < 1) {
    throw new Error("Each selection must have a positive integer id.");
  }
  if (
    typeof selection.model !== "string" ||
    !/^\d{4}$/.test(selection.year) ||
    typeof selection.colorId !== "string"
  ) {
    throw new Error(`Selection ${selection.id} has invalid vehicle context.`);
  }
  if (!expectedStatuses.has(selection.status)) {
    throw new Error(
      `Selection ${selection.id} has unexpected status ${String(selection.status)}.`,
    );
  }
  if (
    !Array.isArray(rawCandidates) ||
    rawCandidates.length < 1
  ) {
    throw new Error(`Selection ${selection.id} has no hydrated candidates.`);
  }
  const candidates = rawCandidates.map((candidate) =>
    validateCandidate(candidate, selection),
  );
  if (new Set(candidates.map((candidate) => candidate.id)).size !== candidates.length) {
    throw new Error(`Selection ${selection.id} has duplicate candidate IDs.`);
  }
  return { selection, candidates };
}

function validateCandidate(raw, selection) {
  const candidate = cloneJson(assertPlainObject(raw, "Candidate"));
  if (!Number.isInteger(candidate.id) || candidate.id < 1) {
    throw new Error(`Selection ${selection.id} includes a candidate without a valid id.`);
  }
  if (
    candidate.model !== selection.model ||
    candidate.year !== selection.year ||
    candidate.colorId !== selection.colorId
  ) {
    throw new Error(
      `Candidate ${candidate.id} does not match selection ${selection.id}.`,
    );
  }
  for (const field of [
    "colorName",
    "sourceKind",
    "fileName",
    "contentType",
    "credit",
    "license",
  ]) {
    if (typeof candidate[field] !== "string" || !candidate[field].trim()) {
      throw new Error(`Candidate ${candidate.id} is missing ${field}.`);
    }
  }
  if (
    !Object.hasOwn(candidate, "originalUrl") ||
    (candidate.originalUrl !== null &&
      (typeof candidate.originalUrl !== "string" ||
        !candidate.originalUrl.trim()))
  ) {
    throw new Error(`Candidate ${candidate.id} has invalid source provenance.`);
  }
  if (typeof candidate.originalUrl === "string") {
    let sourceUrl;
    try {
      sourceUrl = new URL(candidate.originalUrl);
    } catch {
      throw new Error(`Candidate ${candidate.id} has an invalid original URL.`);
    }
    if (
      !["http:", "https:"].includes(sourceUrl.protocol) ||
      sourceUrl.username ||
      sourceUrl.password ||
      [...sourceUrl.searchParams.keys()].some((key) =>
        /(?:auth|credential|key|password|secret|signature|token)/i.test(key),
      )
    ) {
      throw new Error(`Candidate ${candidate.id} has an invalid original URL.`);
    }
  }
  if (
    typeof candidate.sha256 !== "string" ||
    !/^[a-f0-9]{64}$/.test(candidate.sha256)
  ) {
    throw new Error(`Candidate ${candidate.id} has an invalid stored SHA-256.`);
  }
  if (!Number.isInteger(candidate.sizeBytes) || candidate.sizeBytes < 1) {
    throw new Error(`Candidate ${candidate.id} has an invalid byte count.`);
  }
  if (typeof candidate.downloadUrl !== "string" || !candidate.downloadUrl.trim()) {
    throw new Error(`Candidate ${candidate.id} is missing its download URL.`);
  }
  return candidate;
}

export async function fetchQueuedReviewRecords({
  sitesBaseUrl,
  queueToken,
  selectionIds = [],
  fetchImpl = fetch,
  pageLimit = 100,
}) {
  const baseUrl = normalizeSitesBaseUrl(sitesBaseUrl);
  requireQueueToken(queueToken);
  const requestedIds = new Set(selectionIds.map(Number));
  if ([...requestedIds].some((id) => !Number.isInteger(id) || id < 1)) {
    throw new Error("Selection filters must be positive integers.");
  }
  if (!Number.isInteger(pageLimit) || pageLimit < 1 || pageLimit > 100) {
    throw new Error("Queue page limit must be between 1 and 100.");
  }

  const records = [];
  const seenSelectionIds = new Set();
  const seenCursors = new Set();
  let cursor = null;
  do {
    const search = { status: "queued", limit: pageLimit };
    if (cursor !== null) search.cursor = cursor;
    const queuePayload = await fetchQueueJson(
      apiUrl(baseUrl, "/api/selections", search),
      { queueToken, fetchImpl },
    );
    const page = assertPlainObject(queuePayload, "Queued-selection page");
    if (!Array.isArray(page.items)) {
      throw new Error("Queued-selection page items must be an array.");
    }
    for (const rawSelection of page.items) {
      const record = validateSelection(rawSelection);
      if (seenSelectionIds.has(record.selection.id)) {
        throw new Error(`Selection ${record.selection.id} appeared on multiple pages.`);
      }
      seenSelectionIds.add(record.selection.id);
      records.push(record);
    }

    if (page.nextCursor === null) {
      cursor = null;
    } else if (
      Number.isSafeInteger(page.nextCursor) &&
      page.nextCursor > 0 &&
      !seenCursors.has(page.nextCursor)
    ) {
      cursor = page.nextCursor;
      seenCursors.add(cursor);
    } else {
      throw new Error("Queued-selection pagination returned an invalid cursor.");
    }
  } while (cursor !== null);

  const selectedRecords = records
    .filter(
      (record) =>
        !requestedIds.size || requestedIds.has(record.selection.id),
    )
    .sort((left, right) => left.selection.id - right.selection.id);

  if (requestedIds.size) {
    const found = new Set(selectedRecords.map((record) => record.selection.id));
    const missing = [...requestedIds].filter((id) => !found.has(id));
    if (missing.length) {
      throw new Error(`Queued selections were not found: ${missing.join(", ")}.`);
    }
  }

  return {
    baseUrl,
    records: selectedRecords,
    completeQueueSnapshot: requestedIds.size === 0,
  };
}

async function fetchQueueStatusSummaries({
  sitesBaseUrl,
  queueToken,
  status,
  fetchImpl,
}) {
  const baseUrl = normalizeSitesBaseUrl(sitesBaseUrl);
  const summaries = [];
  const seenIds = new Set();
  const seenCursors = new Set();
  let cursor = null;
  do {
    const search = { status, limit: 100 };
    if (cursor !== null) search.cursor = cursor;
    const payload = await fetchQueueJson(
      apiUrl(baseUrl, "/api/selections", search),
      { queueToken, fetchImpl },
    );
    const page = assertPlainObject(payload, `${status} queue page`);
    if (!Array.isArray(page.items)) {
      throw new Error(`${status} queue page items must be an array.`);
    }
    for (const raw of page.items) {
      const item = assertPlainObject(raw, `${status} queue item`);
      if (
        !Number.isSafeInteger(item.id) ||
        item.id < 1 ||
        item.status !== status ||
        seenIds.has(item.id)
      ) {
        throw new Error(`${status} queue page contains an invalid item.`);
      }
      seenIds.add(item.id);
      summaries.push({
        id: item.id,
        status: item.status,
        leaseExpiresAt:
          typeof item.leaseExpiresAt === "string"
            ? item.leaseExpiresAt
            : null,
      });
    }
    if (page.nextCursor === null) {
      cursor = null;
    } else if (
      Number.isSafeInteger(page.nextCursor) &&
      page.nextCursor > 0 &&
      !seenCursors.has(page.nextCursor)
    ) {
      cursor = page.nextCursor;
      seenCursors.add(cursor);
    } else {
      throw new Error(`${status} queue pagination returned an invalid cursor.`);
    }
  } while (cursor !== null);
  return summaries;
}

export async function claimNextSelection({
  sitesBaseUrl,
  queueToken,
  leaseSeconds = DEFAULT_LEASE_SECONDS,
  fetchImpl = fetch,
}) {
  const baseUrl = normalizeSitesBaseUrl(sitesBaseUrl);
  requireQueueToken(queueToken);
  if (
    !Number.isInteger(leaseSeconds) ||
    leaseSeconds < 60 ||
    leaseSeconds > 1800
  ) {
    throw new Error("Lease duration must be between 60 and 1800 seconds.");
  }
  const payload = await fetchQueueJson(
    apiUrl(baseUrl, "/api/selections"),
    {
      queueToken,
      fetchImpl,
      method: "PATCH",
      body: { action: "claim", leaseSeconds },
    },
  );
  const claim = assertPlainObject(payload, "Queue claim");
  if (claim.selection === null && claim.leaseToken === null) return null;
  if (typeof claim.leaseToken !== "string" || !claim.leaseToken) {
    throw new Error("Queue claim did not include a lease token.");
  }
  const rawSelection =
    claim.selection && typeof claim.selection === "object"
      ? claim.selection
      : null;
  const selectionId = rawSelection?.id;
  let record;
  try {
    record = validateSelection(claim.selection, new Set(["leased"]));
  } catch (error) {
    if (!Number.isSafeInteger(selectionId) || selectionId < 1) throw error;
    try {
      await acknowledgeSelection({
        sitesBaseUrl: baseUrl,
        queueToken,
        selectionId,
        leaseToken: claim.leaseToken,
        outcome: "retry",
        errorCode: "claim_hydration_failed",
        fetchImpl,
      });
    } catch (acknowledgmentError) {
      throw new AggregateError(
        [error, acknowledgmentError],
        "Queue claim metadata was invalid and its retry acknowledgment failed.",
      );
    }
    throw error;
  }
  return { leaseToken: claim.leaseToken, record };
}

export async function acknowledgeSelection({
  sitesBaseUrl,
  queueToken,
  selectionId,
  leaseToken,
  outcome,
  errorCode = undefined,
  rejectedCandidateIds = [],
  publishedAssets = [],
  fetchImpl = fetch,
}) {
  const baseUrl = normalizeSitesBaseUrl(sitesBaseUrl);
  requireQueueToken(queueToken);
  if (!Number.isSafeInteger(selectionId) || selectionId < 1) {
    throw new Error("Acknowledgment selection ID must be a positive integer.");
  }
  if (typeof leaseToken !== "string" || !leaseToken) {
    throw new Error("Acknowledgment requires a lease token.");
  }
  if (!["processed", "retry", "failed"].includes(outcome)) {
    throw new Error("Acknowledgment outcome is invalid.");
  }
  if (
    (outcome === "processed" && errorCode !== undefined) ||
    (outcome !== "processed" && !QUEUE_ACK_ERROR_CODE_SET.has(errorCode))
  ) {
    throw new Error("Acknowledgment requires a server-approved error code.");
  }
  if (
    !Array.isArray(rejectedCandidateIds) ||
    rejectedCandidateIds.some(
      (id) => !Number.isSafeInteger(id) || id < 1,
    ) ||
    new Set(rejectedCandidateIds).size !== rejectedCandidateIds.length ||
    (errorCode === "rights_review_rejected"
      ? outcome !== "failed" || rejectedCandidateIds.length < 1
      : rejectedCandidateIds.length > 0)
  ) {
    throw new Error("Acknowledgment rejected-candidate IDs are invalid.");
  }
  if (
    !Array.isArray(publishedAssets) ||
    (outcome === "processed"
      ? publishedAssets.length < 1 ||
        publishedAssets.some(
          (asset) =>
            !asset ||
            typeof asset !== "object" ||
            !Number.isSafeInteger(asset.candidateId) ||
            asset.candidateId < 1 ||
            typeof asset.publishedSha256 !== "string" ||
            !/^[a-f0-9]{64}$/.test(asset.publishedSha256) ||
            typeof asset.publishedAssetPath !== "string" ||
            asset.publishedAssetPath !==
              `public/vehicle-photos/assets/${asset.publishedSha256}.${asset.publishedAssetPath.split(".").at(-1)}` ||
            !/\.(?:jpg|png|gif|webp)$/.test(asset.publishedAssetPath),
        ) ||
        new Set(publishedAssets.map((asset) => asset.candidateId)).size !==
          publishedAssets.length
      : publishedAssets.length > 0)
  ) {
    throw new Error("Acknowledgment published-asset metadata is invalid.");
  }
  const body = {
    action: "ack",
    selectionId,
    leaseToken,
    outcome,
    ...(errorCode ? { errorCode } : {}),
    ...(rejectedCandidateIds.length ? { rejectedCandidateIds } : {}),
    ...(publishedAssets.length ? { publishedAssets } : {}),
  };
  const payload = await fetchQueueJson(
    apiUrl(baseUrl, "/api/selections"),
    { queueToken, fetchImpl, method: "PATCH", body },
  );
  const acknowledgment = assertPlainObject(payload, "Queue acknowledgment");
  if (acknowledgment.ok !== true || typeof acknowledgment.status !== "string") {
    throw new Error("Queue acknowledgment was not confirmed.");
  }
  if (outcome === "processed" && acknowledgment.status !== "processed") {
    throw new Error("Queue did not confirm the processed outcome.");
  }
  if (outcome === "failed" && acknowledgment.status !== "failed") {
    throw new Error("Queue did not confirm the failed outcome.");
  }
  if (
    outcome === "retry" &&
    !["queued", "failed"].includes(acknowledgment.status)
  ) {
    throw new Error("Queue did not confirm the retry outcome.");
  }
  return cloneJson(acknowledgment);
}

export function createReviewTemplate({
  baseUrl,
  records,
  generatedAt,
  completeQueueSnapshot = true,
}) {
  assertNoCredentialMaterial(records);
  const timestamp = generatedAt ?? new Date().toISOString();
  if (Number.isNaN(Date.parse(timestamp))) {
    throw new Error("Review-template timestamp must be an ISO date.");
  }

  const items = [];
  for (const record of records) {
    for (const candidate of record.candidates) {
      items.push({
        selection: reviewableSelectionSnapshot(record.selection),
        candidate: cloneJson(candidate),
        review: {
          decision: "",
          reviewedBy: "",
          reviewedAt: "",
          approvedCredit: candidate.credit,
          approvedLicense: candidate.license,
          approvedSha256: candidate.sha256,
          reviewedOriginalUrl: candidate.originalUrl,
          rightsBasis: "",
          reason: "",
          notes: "",
        },
      });
    }
  }

  return {
    schemaVersion: PUBLICATION_SCHEMA_VERSION,
    sourceBaseUrl: normalizeSitesBaseUrl(baseUrl),
    completeQueueSnapshot: Boolean(completeQueueSnapshot),
    generatedAt: timestamp,
    instructions:
      "Inspect the source and license for every item. Set decision to approve or reject. Approval requires reviewer, date, exact credit and license, and a written rights basis.",
    items,
  };
}

export async function writeNewJson(filePath, value) {
  const resolved = path.resolve(filePath);
  await mkdir(path.dirname(resolved), { recursive: true });
  const handle = await open(resolved, "wx");
  try {
    await handle.writeFile(stableStringify(value), "utf8");
  } finally {
    await handle.close();
  }
}

export async function readJsonFile(filePath) {
  let raw;
  try {
    raw = await readFile(path.resolve(filePath), "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") {
      throw new Error(`JSON file does not exist: ${path.resolve(filePath)}`);
    }
    throw error;
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`JSON file is invalid: ${path.resolve(filePath)}`);
  }
}

function recordKey(selectionId, candidateId) {
  return `${selectionId}:${candidateId}`;
}

export function recordsFromApprovalDocument({
  approvalDocument,
  sitesBaseUrl,
  requireCompleteQueue = false,
}) {
  const document = assertPlainObject(approvalDocument, "Approval document");
  if (document.schemaVersion !== PUBLICATION_SCHEMA_VERSION) {
    throw new Error(
      `Approval document schemaVersion must be ${PUBLICATION_SCHEMA_VERSION}.`,
    );
  }
  if (
    normalizeSitesBaseUrl(document.sourceBaseUrl) !==
    normalizeSitesBaseUrl(sitesBaseUrl)
  ) {
    throw new Error("Approval document belongs to a different Sites deployment.");
  }
  if (
    requireCompleteQueue &&
    document.completeQueueSnapshot !== true
  ) {
    throw new Error(
      "A complete queue review is required before claiming selections.",
    );
  }
  if (!Array.isArray(document.items)) {
    throw new Error("Approval document items must be an array.");
  }

  const grouped = new Map();
  for (const rawItem of document.items) {
    const item = assertPlainObject(rawItem, "Approval item");
    const selection = cloneJson(
      assertPlainObject(item.selection, "Selection snapshot"),
    );
    const candidate = cloneJson(
      assertPlainObject(item.candidate, "Candidate snapshot"),
    );
    if (!Number.isSafeInteger(selection.id) || selection.id < 1) {
      throw new Error("Approval item has an invalid selection ID.");
    }
    const existing = grouped.get(selection.id);
    if (
      existing &&
      stableStringify(existing.selection) !== stableStringify(selection)
    ) {
      throw new Error(`Selection ${selection.id} has inconsistent snapshots.`);
    }
    const record = existing ?? { selection, candidates: [] };
    if (record.candidates.some((entry) => entry.id === candidate.id)) {
      throw new Error(
        `Selection ${selection.id} repeats candidate ${candidate.id}.`,
      );
    }
    record.candidates.push(candidate);
    grouped.set(selection.id, record);
  }
  return [...grouped.values()]
    .map((record) => {
      const validated = validateSelection(
        {
          ...record.selection,
          candidates: record.candidates,
        },
        new Set(["queued"]),
      );
      validated.candidates.sort((left, right) => left.id - right.id);
      return validated;
    })
    .sort((left, right) => left.selection.id - right.selection.id);
}

function requireText(value, label) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} is required.`);
  }
  return value;
}

function validateReviewTimestamp(value, label) {
  requireText(value, label);
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})$/.test(
      value,
    ) ||
    Number.isNaN(Date.parse(value))
  ) {
    throw new Error(`${label} must be an ISO timestamp with a timezone.`);
  }
}

function reviewableSelectionSnapshot(selection) {
  const snapshot = cloneJson(selection);
  delete snapshot.lastError;
  delete snapshot.lastErrorCode;
  delete snapshot.errorCode;
  return snapshot;
}

function publicOriginalUrl(value) {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") {
    throw new Error("Publication provenance URL is invalid.");
  }
  const url = new URL(value);
  url.search = "";
  url.hash = "";
  return url.toString();
}

function publicCandidateSnapshot(candidate) {
  const snapshot = cloneJson(candidate);
  delete snapshot.downloadUrl;
  delete snapshot.publishedSha256;
  delete snapshot.publishedAssetPath;
  delete snapshot.publishedAt;
  snapshot.originalUrl = publicOriginalUrl(snapshot.originalUrl);
  return snapshot;
}

function publicRightsReviewSnapshot(review) {
  const snapshot = {
    decision: review.decision,
    reviewedBy: review.reviewedBy,
    reviewedAt: review.reviewedAt,
    approvedCredit: review.approvedCredit,
    approvedLicense: review.approvedLicense,
    approvedSha256: review.approvedSha256,
    reviewedOriginalUrl: publicOriginalUrl(review.reviewedOriginalUrl),
    rightsBasis: review.rightsBasis,
  };
  return cloneJson(snapshot);
}

function scrubManifestProvenance(manifest) {
  for (const publication of manifest.publications) {
    if (publication?.candidate) {
      publication.candidate = publicCandidateSnapshot(publication.candidate);
    }
    if (publication?.rightsReview?.decision === "approve") {
      publication.rightsReview = publicRightsReviewSnapshot(
        publication.rightsReview,
      );
    }
  }
}

function immutableSelectionSnapshot(selection) {
  const snapshot = reviewableSelectionSnapshot(selection);
  for (const field of [
    "status",
    "attemptCount",
    "leaseExpiresAt",
    "processedAt",
  ]) {
    delete snapshot[field];
  }
  return snapshot;
}

export function validateApprovalDocument({
  approvalDocument,
  baseUrl,
  records,
  allowLeaseTransition = false,
}) {
  const document = assertPlainObject(approvalDocument, "Approval document");
  if (document.schemaVersion !== PUBLICATION_SCHEMA_VERSION) {
    throw new Error(
      `Approval document schemaVersion must be ${PUBLICATION_SCHEMA_VERSION}.`,
    );
  }
  if (normalizeSitesBaseUrl(document.sourceBaseUrl) !== normalizeSitesBaseUrl(baseUrl)) {
    throw new Error("Approval document belongs to a different Sites deployment.");
  }
  if (!Array.isArray(document.items)) {
    throw new Error("Approval document items must be an array.");
  }
  if (typeof document.completeQueueSnapshot !== "boolean") {
    throw new Error("Approval document must identify whether its queue snapshot is complete.");
  }

  const liveItems = new Map();
  for (const record of records) {
    for (const candidate of record.candidates) {
      liveItems.set(recordKey(record.selection.id, candidate.id), {
        selection: record.selection,
        candidate,
      });
    }
  }
  if (document.items.length !== liveItems.size) {
    throw new Error("Every selected candidate must have exactly one review decision.");
  }

  const decisions = [];
  const seen = new Set();
  for (const rawItem of document.items) {
    const item = assertPlainObject(rawItem, "Approval item");
    const selectionSnapshot = assertPlainObject(item.selection, "Selection snapshot");
    const candidateSnapshot = assertPlainObject(item.candidate, "Candidate snapshot");
    const key = recordKey(selectionSnapshot.id, candidateSnapshot.id);
    if (seen.has(key)) throw new Error(`Duplicate approval item ${key}.`);
    seen.add(key);

    const live = liveItems.get(key);
    if (!live) throw new Error(`Approval item ${key} is not in the current queue.`);
    const reviewedSelection = allowLeaseTransition
      ? immutableSelectionSnapshot(selectionSnapshot)
      : reviewableSelectionSnapshot(selectionSnapshot);
    const currentSelection = allowLeaseTransition
      ? immutableSelectionSnapshot(live.selection)
      : reviewableSelectionSnapshot(live.selection);
    if (
      stableStringify(reviewedSelection) !== stableStringify(currentSelection) ||
      stableStringify(candidateSnapshot) !== stableStringify(live.candidate)
    ) {
      throw new Error(`Approval item ${key} no longer matches current Sites metadata.`);
    }

    const review = cloneJson(assertPlainObject(item.review, `Review ${key}`));
    if (review.decision !== "approve" && review.decision !== "reject") {
      throw new Error(`Review ${key} must explicitly say approve or reject.`);
    }
    if (review.decision === "approve") {
      requireText(review.reviewedBy, `Review ${key} reviewer`);
      validateReviewTimestamp(review.reviewedAt, `Review ${key} reviewedAt`);
      requireText(review.rightsBasis, `Review ${key} rightsBasis`);
      if (review.approvedCredit !== live.candidate.credit) {
        throw new Error(`Review ${key} credit does not match current metadata.`);
      }
      if (review.approvedLicense !== live.candidate.license) {
        throw new Error(`Review ${key} license does not match current metadata.`);
      }
      if (review.approvedSha256 !== live.candidate.sha256) {
        throw new Error(`Review ${key} SHA-256 does not match current metadata.`);
      }
      if (review.reviewedOriginalUrl !== live.candidate.originalUrl) {
        throw new Error(
          `Review ${key} original URL does not match current metadata.`,
        );
      }
    } else {
      requireText(review.reason, `Review ${key} rejection reason`);
    }
    decisions.push({
      key,
      ...live,
      reviewedSelection: reviewableSelectionSnapshot(selectionSnapshot),
      review,
    });
  }

  const missing = [...liveItems.keys()].filter((key) => !seen.has(key));
  if (missing.length) {
    throw new Error(`Missing review decisions: ${missing.join(", ")}.`);
  }
  return decisions.sort((left, right) => left.key.localeCompare(right.key));
}

function normalizeMime(value) {
  return String(value ?? "")
    .split(";", 1)[0]
    .trim()
    .toLowerCase();
}

export function detectImageMime(bytes) {
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    )
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 6 &&
    (bytes.subarray(0, 6).toString("ascii") === "GIF87a" ||
      bytes.subarray(0, 6).toString("ascii") === "GIF89a")
  ) {
    return "image/gif";
  }
  if (
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
    bytes.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

async function readBoundedResponseBody(response, maxBytes, candidateId) {
  if (!response.body) {
    throw new Error(`Candidate ${candidateId} download did not include a body.`);
  }
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = Buffer.from(value);
      total += chunk.length;
      if (total > maxBytes) {
        await reader
          .cancel("Publication size limit exceeded.")
          .catch(() => undefined);
        throw new Error(
          `Candidate ${candidateId} exceeds the publication size limit.`,
        );
      }
      chunks.push(chunk);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks, total);
}

async function fetchCandidateBytes({
  baseUrl,
  candidate,
  queueToken,
  fetchImpl,
  maxAssetBytes,
}) {
  const token = requireQueueToken(queueToken);
  let url;
  try {
    url = new URL(candidate.downloadUrl);
  } catch {
    throw new Error(`Candidate ${candidate.id} has an invalid download URL.`);
  }
  const base = new URL(normalizeSitesBaseUrl(baseUrl));
  if (
    url.origin !== base.origin ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !url.pathname.endsWith(`/api/photos/${candidate.id}`)
  ) {
    throw new Error(`Candidate ${candidate.id} download URL is outside the Sites origin.`);
  }
  const response = await fetchImpl(url, {
    headers: {
      accept: "image/*",
      authorization: `Bearer ${token}`,
    },
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) {
    throw new Error(
      `Candidate ${candidate.id} download failed with HTTP ${response.status}.`,
    );
  }

  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxAssetBytes) {
    throw new Error(`Candidate ${candidate.id} exceeds the publication size limit.`);
  }
  const bytes = await readBoundedResponseBody(
    response,
    maxAssetBytes,
    candidate.id,
  );
  if (bytes.length < 1 || bytes.length > maxAssetBytes) {
    throw new Error(`Candidate ${candidate.id} exceeds the publication size limit.`);
  }
  if (bytes.length !== candidate.sizeBytes) {
    throw new Error(`Candidate ${candidate.id} byte count changed after review.`);
  }
  const sourceSha256 = createHash("sha256").update(bytes).digest("hex");
  if (sourceSha256 !== candidate.sha256) {
    throw new Error(
      `Candidate ${candidate.id} SHA-256 changed after rights review.`,
    );
  }

  const detectedMime = detectImageMime(bytes);
  const metadataMime = normalizeMime(candidate.contentType);
  const responseMime = normalizeMime(response.headers.get("content-type"));
  if (!detectedMime || !MIME_EXTENSIONS.has(detectedMime)) {
    throw new Error(`Candidate ${candidate.id} is not a supported image.`);
  }
  if (metadataMime !== detectedMime || (responseMime && responseMime !== detectedMime)) {
    throw new Error(`Candidate ${candidate.id} image type does not match its metadata.`);
  }
  const sanitized = await sanitizeImageForPublication(bytes, detectedMime);

  return {
    bytes: sanitized.bytes,
    mediaType: detectedMime,
    extension: MIME_EXTENSIONS.get(detectedMime),
    sha256: sanitized.publishedSha256,
    width: sanitized.width,
    height: sanitized.height,
    transform: {
      ...sanitized.transform,
      sourceSha256: sanitized.sourceSha256,
      publishedSha256: sanitized.publishedSha256,
    },
  };
}

export function normalizeRelativeRepoPath(value, label = "Repository path") {
  const raw = String(value ?? "").trim().replaceAll("\\", "/");
  if (
    !raw ||
    raw.startsWith("/") ||
    /^[A-Za-z]:/.test(raw) ||
    raw.split("/").some((part) => part === ".." || part === ".")
  ) {
    throw new Error(`${label} must be a safe repository-relative path.`);
  }
  const normalized = posix.normalize(raw).replace(/^\.\/+/, "").replace(/\/+$/, "");
  if (!normalized || normalized === ".") {
    throw new Error(`${label} must be a safe repository-relative path.`);
  }
  return normalized;
}

function resolveRepoPath(repoRoot, relativePath) {
  const root = path.resolve(repoRoot);
  const resolved = path.resolve(root, ...relativePath.split("/"));
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error("Resolved publication path escapes the repository.");
  }
  return resolved;
}

async function sha256File(filePath) {
  return createHash("sha256").update(await readFile(filePath)).digest("hex");
}

async function writeAssetWithoutReplacement(filePath, bytes, expectedSha256) {
  await mkdir(path.dirname(filePath), { recursive: true });
  try {
    const handle = await open(filePath, "wx");
    try {
      await handle.writeFile(bytes);
    } finally {
      await handle.close();
    }
    return "written";
  } catch (error) {
    if (error?.code !== "EEXIST") throw error;
    const existingSha256 = await sha256File(filePath);
    if (existingSha256 !== expectedSha256) {
      throw new Error(`Refusing to replace a different file at ${filePath}.`);
    }
    return "deduplicated";
  }
}

function emptyManifest() {
  return {
    schemaVersion: ATTRIBUTION_SCHEMA_VERSION,
    archive: "Chevrolet Color Archive",
    assets: [],
    publications: [],
  };
}

async function readManifest(manifestPath) {
  let payload;
  try {
    payload = JSON.parse(await readFile(manifestPath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return emptyManifest();
    if (error instanceof SyntaxError) {
      throw new Error(`Existing attribution manifest is invalid JSON: ${manifestPath}`);
    }
    throw error;
  }
  assertPlainObject(payload, "Attribution manifest");
  if (payload.schemaVersion !== ATTRIBUTION_SCHEMA_VERSION) {
    throw new Error("Existing attribution manifest has an unsupported schema.");
  }
  if (!Array.isArray(payload.assets) || !Array.isArray(payload.publications)) {
    throw new Error("Existing attribution manifest is missing required arrays.");
  }
  assertNoCredentialMaterial(payload);
  return payload;
}

async function writeManifestAtomically(manifestPath, manifest) {
  await mkdir(path.dirname(manifestPath), { recursive: true });
  const temporaryPath = `${manifestPath}.${process.pid}.${randomUUID()}.tmp`;
  try {
    const handle = await open(temporaryPath, "wx");
    try {
      await handle.writeFile(stableStringify(manifest), "utf8");
    } finally {
      await handle.close();
    }
    await rename(temporaryPath, manifestPath);
  } catch (error) {
    try {
      await unlink(temporaryPath);
    } catch (cleanupError) {
      if (cleanupError?.code !== "ENOENT") throw cleanupError;
    }
    throw error;
  }
}

export async function publishReviewedSelections({
  sitesBaseUrl,
  queueToken,
  records,
  approvalDocument,
  repoRoot,
  assetRoot = DEFAULT_ASSET_ROOT,
  fetchImpl = fetch,
  maxAssetBytes = DEFAULT_MAX_ASSET_BYTES,
  allowLeaseTransition = false,
}) {
  const baseUrl = normalizeSitesBaseUrl(sitesBaseUrl);
  const token = requireQueueToken(queueToken);
  assertNoCredentialMaterial(approvalDocument, {
    knownSecrets: [token],
  });
  const normalizedAssetRoot = normalizeRelativeRepoPath(assetRoot, "Asset root");
  const normalizedManifestPath = `${normalizedAssetRoot}/attribution.json`;
  const root = path.resolve(repoRoot);
  const rootStats = await stat(root).catch(() => null);
  if (!rootStats?.isDirectory()) {
    throw new Error("Repository root must be an existing directory.");
  }

  const decisions = validateApprovalDocument({
    approvalDocument,
    baseUrl,
    records,
    allowLeaseTransition,
  });
  const rejected = decisions.filter(
    (decision) => decision.review.decision !== "approve",
  );
  if (rejected.length) {
    throw new Error(
      "Atomic publication requires every candidate in each selection to be approved.",
    );
  }
  const approved = decisions.filter((decision) => decision.review.decision === "approve");

  const fetchedByCandidateId = new Map();
  for (const decision of approved) {
    if (!fetchedByCandidateId.has(decision.candidate.id)) {
      fetchedByCandidateId.set(
        decision.candidate.id,
        await fetchCandidateBytes({
          baseUrl,
          candidate: decision.candidate,
          queueToken,
          fetchImpl,
          maxAssetBytes,
        }),
      );
    }
  }

  const manifestPath = resolveRepoPath(root, normalizedManifestPath);
  const priorManifest = await readManifest(manifestPath);
  const nextManifest = cloneJson(priorManifest);
  scrubManifestProvenance(nextManifest);
  const assetsBySha = new Map(nextManifest.assets.map((asset) => [asset.sha256, asset]));
  const publicationsByKey = new Map(
    nextManifest.publications.map((publication) => [
      publication.publicationKey,
      publication,
    ]),
  );

  const stagedAssets = new Map();
  for (const decision of approved) {
    const fetched = fetchedByCandidateId.get(decision.candidate.id);
    const relativePath = `${normalizedAssetRoot}/assets/${fetched.sha256}.${fetched.extension}`;
    const asset = {
      sha256: fetched.sha256,
      path: relativePath,
      mediaType: fetched.mediaType,
      bytes: fetched.bytes.length,
      width: fetched.width,
      height: fetched.height,
      sanitizer: {
        name: fetched.transform.name,
        version: fetched.transform.version,
      },
    };
    const existingAsset = assetsBySha.get(fetched.sha256);
    if (existingAsset) {
      if (stableStringify(existingAsset) !== stableStringify(asset)) {
        throw new Error(`Asset metadata conflict for SHA-256 ${fetched.sha256}.`);
      }
    } else {
      nextManifest.assets.push(asset);
      assetsBySha.set(fetched.sha256, asset);
    }

    const publication = {
      publicationKey: decision.key,
      assetSha256: fetched.sha256,
      sourceBaseUrl: baseUrl,
      sourceDownloadPath: `/api/photos/${decision.candidate.id}`,
      selection: reviewableSelectionSnapshot(decision.reviewedSelection),
      candidate: publicCandidateSnapshot(decision.candidate),
      rightsReview: publicRightsReviewSnapshot(decision.review),
      transform: cloneJson(fetched.transform),
    };
    const existingPublication = publicationsByKey.get(decision.key);
    if (existingPublication) {
      if (stableStringify(existingPublication) !== stableStringify(publication)) {
        throw new Error(`Publication record ${decision.key} already exists with different data.`);
      }
    } else {
      nextManifest.publications.push(publication);
      publicationsByKey.set(decision.key, publication);
    }
    stagedAssets.set(fetched.sha256, {
      relativePath,
      bytes: fetched.bytes,
      sha256: fetched.sha256,
    });
  }

  nextManifest.assets.sort((left, right) => left.sha256.localeCompare(right.sha256));
  nextManifest.publications.sort((left, right) =>
    left.publicationKey.localeCompare(right.publicationKey),
  );

  const changedPaths = [];
  let writtenAssets = 0;
  let deduplicatedAssets = 0;
  for (const asset of stagedAssets.values()) {
    const outcome = await writeAssetWithoutReplacement(
      resolveRepoPath(root, asset.relativePath),
      asset.bytes,
      asset.sha256,
    );
    if (outcome === "written") {
      writtenAssets += 1;
      changedPaths.push(asset.relativePath);
    } else {
      deduplicatedAssets += 1;
    }
  }

  const manifestChanged =
    stableStringify(priorManifest) !== stableStringify(nextManifest);
  if (manifestChanged) {
    await writeManifestAtomically(manifestPath, nextManifest);
    changedPaths.push(normalizedManifestPath);
  }

  return {
    queuedSelections: records.length,
    reviewedCandidates: decisions.length,
    approvedCandidates: approved.length,
    rejectedCandidates: decisions.length - approved.length,
    writtenAssets,
    deduplicatedAssets,
    manifestChanged,
    manifestPath: normalizedManifestPath,
    changedPaths: [...new Set(changedPaths)].sort(),
    publicationPaths: [
      ...new Set([
        ...stagedAssets.values().map((asset) => asset.relativePath),
        ...(approved.length ? [normalizedManifestPath] : []),
      ]),
    ].sort(),
    publishedAssets: approved
      .map((decision) => {
        const fetched = fetchedByCandidateId.get(decision.candidate.id);
        return {
          candidateId: decision.candidate.id,
          publishedSha256: fetched.sha256,
          publishedAssetPath: `${normalizedAssetRoot}/assets/${fetched.sha256}.${fetched.extension}`,
        };
      })
      .sort((left, right) => left.candidateId - right.candidateId),
  };
}

export function approvalDocumentForSelection(approvalDocument, selectionId) {
  const document = cloneJson(
    assertPlainObject(approvalDocument, "Approval document"),
  );
  if (!Array.isArray(document.items)) {
    throw new Error("Approval document items must be an array.");
  }
  document.items = document.items.filter(
    (item) => item?.selection?.id === selectionId,
  );
  if (!document.items.length) {
    throw new Error(`Approval document has no items for selection ${selectionId}.`);
  }
  return document;
}

export async function publishClaimedQueue({
  sitesBaseUrl,
  queueToken,
  queueSnapshotRecords,
  approvalDocument,
  repoRoot,
  assetRoot = DEFAULT_ASSET_ROOT,
  leaseSeconds = DEFAULT_LEASE_SECONDS,
  fetchImpl = fetch,
  pushPublication,
}) {
  const baseUrl = normalizeSitesBaseUrl(sitesBaseUrl);
  requireQueueToken(queueToken);
  if (
    normalizeRelativeRepoPath(assetRoot, "Asset root") !== DEFAULT_ASSET_ROOT
  ) {
    throw new Error(
      `Claimed publication must use the canonical asset root ${DEFAULT_ASSET_ROOT}.`,
    );
  }
  if (approvalDocument?.completeQueueSnapshot !== true) {
    throw new Error(
      "A complete queue review is required before claiming selections.",
    );
  }
  if (typeof pushPublication !== "function") {
    throw new Error("Claimed publication requires an explicit push function.");
  }

  validateApprovalDocument({
    approvalDocument,
    baseUrl,
    records: queueSnapshotRecords,
  });
  const expected = new Map(
    queueSnapshotRecords.map((record) => [record.selection.id, record]),
  );
  const results = [];
  for (const status of ["processed", "failed"]) {
    const terminal = await fetchQueueStatusSummaries({
      sitesBaseUrl: baseUrl,
      queueToken,
      status,
      fetchImpl,
    });
    for (const item of terminal) {
      if (expected.delete(item.id)) {
        results.push({
          selectionId: item.id,
          outcome: `already-${status}`,
        });
      }
    }
  }
  const leased = await fetchQueueStatusSummaries({
    sitesBaseUrl: baseUrl,
    queueToken,
    status: "leased",
    fetchImpl,
  });
  const now = Date.now();
  const activeReviewedLeases = leased.filter(
    (item) =>
      expected.has(item.id) &&
      item.leaseExpiresAt &&
      Date.parse(item.leaseExpiresAt) > now,
  );
  if (activeReviewedLeases.length) {
    throw new Error(
      `Reviewed selection ${activeReviewedLeases[0].id} has an active publisher lease.`,
    );
  }

  while (expected.size) {
    const claim = await claimNextSelection({
      sitesBaseUrl: baseUrl,
      queueToken,
      leaseSeconds,
      fetchImpl,
    });
    if (!claim) {
      throw new Error(
        `Queue became empty before ${expected.size} reviewed selection(s) were claimed.`,
      );
    }

    const selectionId = claim.record.selection.id;
    let publication;
    let git;
    let pushConfirmed = false;
    let acknowledgmentCompleted = false;
    let failureOutcome = "retry";
    let failureCode = "claim_not_in_review";
    let failureRejectedCandidateIds = [];
    try {
      if (!expected.has(selectionId)) {
        throw new Error(
          `Claimed selection ${selectionId} was not in the completed rights review.`,
        );
      }

      failureCode = "approval_metadata_invalid";
      const selectionApprovals = approvalDocumentForSelection(
        approvalDocument,
        selectionId,
      );
      const decisions = validateApprovalDocument({
        approvalDocument: selectionApprovals,
        baseUrl,
        records: [claim.record],
        allowLeaseTransition: true,
      });
      if (decisions.some((decision) => decision.review.decision !== "approve")) {
        failureOutcome = "failed";
        failureCode = "rights_review_rejected";
        failureRejectedCandidateIds = decisions
          .filter((decision) => decision.review.decision === "reject")
          .map((decision) => decision.candidate.id);
        await acknowledgeSelection({
          sitesBaseUrl: baseUrl,
          queueToken,
          selectionId,
          leaseToken: claim.leaseToken,
          outcome: failureOutcome,
          errorCode: failureCode,
          rejectedCandidateIds: failureRejectedCandidateIds,
          fetchImpl,
        });
        acknowledgmentCompleted = true;
        expected.delete(selectionId);
        results.push({
          selectionId,
          outcome: "failed-rights-review",
          approvedCandidates: 0,
        });
        continue;
      }

      failureCode = "publication_pre_push_failed";
      publication = await publishReviewedSelections({
        sitesBaseUrl: baseUrl,
        queueToken,
        records: [claim.record],
        approvalDocument: selectionApprovals,
        repoRoot,
        assetRoot,
        fetchImpl,
        allowLeaseTransition: true,
      });
      git = await pushPublication(publication);
      if (git?.pushed !== true) {
        throw new Error("GitHub push was not confirmed.");
      }
      pushConfirmed = true;
      await acknowledgeSelection({
        sitesBaseUrl: baseUrl,
        queueToken,
        selectionId,
        leaseToken: claim.leaseToken,
        outcome: "processed",
        publishedAssets: publication.publishedAssets,
        fetchImpl,
      });
      acknowledgmentCompleted = true;
    } catch (error) {
      if (!pushConfirmed && !acknowledgmentCompleted) {
        try {
          await acknowledgeSelection({
            sitesBaseUrl: baseUrl,
            queueToken,
            selectionId,
            leaseToken: claim.leaseToken,
            outcome: failureOutcome,
            errorCode: failureCode,
            rejectedCandidateIds: failureRejectedCandidateIds,
            fetchImpl,
          });
        } catch (acknowledgmentError) {
          throw new AggregateError(
            [error, acknowledgmentError],
            "Publication failed and the queue disposition acknowledgment also failed.",
          );
        }
      }
      throw error;
    }

    expected.delete(selectionId);
    results.push({
      selectionId,
      outcome: "processed",
      publication,
      git,
    });
  }

  return {
    processedSelections: results.filter(
      (result) => result.outcome === "processed",
    ).length,
    failedRightsSelections: results.filter(
      (result) => result.outcome === "failed-rights-review",
    ).length,
    skippedTerminalSelections: results.filter((result) =>
      result.outcome.startsWith("already-"),
    ).length,
    results,
  };
}

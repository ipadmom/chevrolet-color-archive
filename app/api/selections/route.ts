import {
  and,
  asc,
  desc,
  eq,
  gte,
  gt,
  inArray,
  isNull,
  lt,
  or,
  sql,
} from "drizzle-orm";
import { models } from "../../archive-data";
import { getDb } from "../../../db";
import {
  photoCandidates,
  photoReviewSelections,
  photoUploadReceipts,
} from "../../../db/schema";
import {
  createOpaqueToken,
  isQueueErrorCode,
  isQueueStatus,
  isReceiptToken,
  MAX_CANDIDATES_PER_SELECTION,
  parseBoundedInteger,
  parsePublishedAssetMappings,
  PUBLISHED_ASSET_ROOT,
  publishedAssetExtension,
  resolveArchiveContext,
  sha256Hex,
  UPLOAD_RECEIPT_TTL_SECONDS,
} from "../archive-security.mjs";
import {
  apiControlErrorResponse,
  corsPreflight,
  enforceSubmissionRateLimit,
  getArchiveEnv,
  isAllowedBrowserOrigin,
  jsonResponse,
  requireQueueAuthorization,
} from "../server-controls";

export const runtime = "edge";

const maxQueueAttempts = 5;
const maxJsonBytes = 32 * 1024;
const expiredReceiptGraceSeconds = 7 * 24 * 60 * 60;
const rejectedObjectPurgeGraceSeconds = 2 * 60 * 60;

type SelectionRequest = {
  model?: unknown;
  year?: unknown;
  colorId?: unknown;
  // Published choices are browser-local preferences. Anonymous queue
  // submissions may contain only one-use staged upload receipts.
  candidateIds?: unknown;
  receipts?: unknown;
};

type QueuePatch = {
  action?: unknown;
  leaseSeconds?: unknown;
  selectionId?: unknown;
  leaseToken?: unknown;
  outcome?: unknown;
  errorCode?: unknown;
  rejectedCandidateIds?: unknown;
  publishedAssets?: unknown;
};

export function OPTIONS(request: Request) {
  return corsPreflight(request, ["GET", "POST", "PATCH", "OPTIONS"]);
}

export async function GET(request: Request) {
  const unauthorized = await requireQueueAuthorization(request);
  if (unauthorized) return unauthorized;

  const url = new URL(request.url);
  const requestedStatus = url.searchParams.get("status") ?? "queued";
  if (!isQueueStatus(requestedStatus)) {
    return jsonResponse(
      request,
      { error: "Unknown queue status." },
      { status: 400 },
    );
  }
  const limit = parseBoundedInteger(
    url.searchParams.get("limit"),
    25,
    1,
    100,
  );
  const cursorValue = url.searchParams.get("cursor");
  const cursor =
    cursorValue && /^\d+$/.test(cursorValue) ? Number(cursorValue) : null;
  if (cursorValue && (!Number.isSafeInteger(cursor) || Number(cursor) < 1)) {
    return jsonResponse(
      request,
      { error: "cursor must be a positive integer." },
      { status: 400 },
    );
  }

  const statusFilter = eq(photoReviewSelections.status, requestedStatus);
  const rows = await getDb()
    .select()
    .from(photoReviewSelections)
    .where(
      cursor
        ? and(statusFilter, lt(photoReviewSelections.id, cursor))
        : statusFilter,
    )
    .orderBy(desc(photoReviewSelections.id))
    .limit(limit + 1);
  const hasMore = rows.length > limit;
  const page = rows.slice(0, limit);
  return jsonResponse(request, {
    items: await hydrateSelections(page, request),
    nextCursor: hasMore ? page.at(-1)?.id ?? null : null,
  });
}

export async function POST(request: Request) {
  if (!isAllowedBrowserOrigin(request)) {
    return jsonResponse(request, { error: "Origin not allowed." }, { status: 403 });
  }
  const contentLength = request.headers.get("content-length");
  if (!contentLength) {
    return jsonResponse(
      request,
      { error: "A bounded Content-Length header is required." },
      { status: 411 },
    );
  }
  if (
    (!/^\d+$/.test(contentLength) || Number(contentLength) > maxJsonBytes)
  ) {
    return jsonResponse(
      request,
      { error: "The selection request is too large." },
      { status: 413 },
    );
  }

  try {
    await enforceSubmissionRateLimit(request, "photo-selection");
  } catch (error) {
    const controlled = apiControlErrorResponse(request, error);
    if (controlled) return controlled;
    return jsonResponse(
      request,
      { error: "Submission protection is temporarily unavailable." },
      { status: 503 },
    );
  }

  let payload: SelectionRequest;
  try {
    const parsed: unknown = await request.json();
    if (!isPlainRecord(parsed)) throw new Error("Expected a JSON object.");
    payload = parsed;
  } catch {
    return jsonResponse(request, { error: "Invalid JSON." }, { status: 400 });
  }

  const context = resolveArchiveContext(
    models,
    payload.model,
    payload.year,
    payload.colorId,
  );
  const candidateIds = parseCandidateIds(payload.candidateIds);
  const receipts = parseReceipts(payload.receipts);
  if (!context || candidateIds === null || receipts === null) {
    return jsonResponse(
      request,
      { error: "The selection contains invalid archive identifiers." },
      { status: 400 },
    );
  }
  if (candidateIds.length) {
    return jsonResponse(
      request,
      {
        error:
          "Published choices stay in this browser. Only staged upload receipts can enter the publication queue.",
      },
      { status: 400 },
    );
  }
  if (
    receipts.length < 1 ||
    receipts.length > MAX_CANDIDATES_PER_SELECTION
  ) {
    return jsonResponse(
      request,
      { error: "Choose between 1 and 20 candidates." },
      { status: 400 },
    );
  }

  const db = getDb();
  await cleanupExpiredUploadReceipts().catch(() => undefined);
  const receiptCutoff = new Date(
    Date.now() - UPLOAD_RECEIPT_TTL_SECONDS * 1000,
  ).toISOString();
  const receiptHashes = await Promise.all(receipts.map((value) => sha256Hex(value)));
  const receiptCandidates = receiptHashes.length
    ? await db
        .select({
          receiptHash: photoUploadReceipts.receiptHash,
          candidateId: photoCandidates.id,
          eligible: sql<number>`CASE
            WHEN ${photoUploadReceipts.consumedAt} IS NULL
              AND datetime(${photoUploadReceipts.createdAt}) >= datetime(${receiptCutoff})
              AND ${photoCandidates.status} = 'staged'
            THEN 1
            ELSE 0
          END`,
        })
        .from(photoUploadReceipts)
        .innerJoin(
          photoCandidates,
          eq(photoUploadReceipts.candidateId, photoCandidates.id),
        )
        .where(
          and(
            inArray(photoUploadReceipts.receiptHash, receiptHashes),
            eq(photoCandidates.model, context.model),
            eq(photoCandidates.year, context.year),
            eq(photoCandidates.colorId, context.colorId),
          ),
        )
    : [];
  if (receiptCandidates.length !== receiptHashes.length) {
    return jsonResponse(
      request,
      { error: "A staged upload receipt is invalid or belongs elsewhere." },
      { status: 409 },
    );
  }

  const allCandidateIds = [
    ...new Set(receiptCandidates.map((entry) => entry.candidateId)),
  ].sort((left, right) => left - right);
  if (!allCandidateIds.length) {
    return jsonResponse(
      request,
      { error: "No eligible candidates were selected." },
      { status: 409 },
    );
  }

  const candidateIdsJson = JSON.stringify(allCandidateIds);
  const existing = await findActiveSelection(context, candidateIdsJson);
  if (existing) {
    return jsonResponse(request, {
      queued: true,
      selectionId: existing.id,
      created: false,
    });
  }
  if (receiptCandidates.some((entry) => Number(entry.eligible) !== 1)) {
    return jsonResponse(
      request,
      {
        error:
          "A staged upload receipt expired, was already used, or the candidate is no longer eligible.",
      },
      { status: 409 },
    );
  }

  let queued: { id: number; created: boolean };
  try {
    const result = await enqueueSelectionAtomically({
      context,
      candidateIdsJson,
      receiptHashes,
      receiptCutoff,
    });
    if (!result) {
      return jsonResponse(
        request,
        {
          error:
            "A staged upload receipt expired, was already used, or the candidate is no longer eligible.",
        },
        { status: 409 },
      );
    }
    queued = result;
  } catch {
    return jsonResponse(
      request,
      { error: "The selection could not be queued." },
      { status: 503 },
    );
  }

  return jsonResponse(
    request,
    {
      queued: true,
      selectionId: queued.id,
      created: queued.created,
    },
    { status: queued.created ? 201 : 200 },
  );
}

async function enqueueSelectionAtomically({
  context,
  candidateIdsJson,
  receiptHashes,
  receiptCutoff,
}: {
  context: {
    model: string;
    year: string;
    colorId: string;
  };
  candidateIdsJson: string;
  receiptHashes: string[];
  receiptCutoff: string;
}): Promise<{ id: number; created: boolean } | null> {
  const db = getDb();
  const receiptList = sql.join(
    receiptHashes.map((hash) => sql`${hash}`),
    sql`, `,
  );
  const receiptEligibility = receiptHashes.length
    ? sql`(
        SELECT COUNT(DISTINCT ${photoUploadReceipts.receiptHash})
        FROM ${photoUploadReceipts}
        INNER JOIN ${photoCandidates}
          ON ${photoUploadReceipts.candidateId} = ${photoCandidates.id}
        WHERE ${photoUploadReceipts.receiptHash} IN (${receiptList})
          AND ${photoUploadReceipts.consumedAt} IS NULL
          AND datetime(${photoUploadReceipts.createdAt}) >= datetime(${receiptCutoff})
          AND ${photoCandidates.model} = ${context.model}
          AND ${photoCandidates.year} = ${context.year}
          AND ${photoCandidates.colorId} = ${context.colorId}
          AND ${photoCandidates.status} = 'staged'
      ) = ${receiptHashes.length}`
    : sql`1 = 1`;
  const noActiveCandidateOverlap = receiptHashes.length
    ? sql`NOT EXISTS (
        SELECT 1
        FROM photo_review_selections AS active_selection,
          json_each(active_selection.candidate_ids_json) AS active_candidate
        WHERE active_selection.status IN ('queued', 'leased')
          AND CAST(active_candidate.value AS INTEGER) IN (
            SELECT candidate_id
            FROM photo_upload_receipts
            WHERE receipt_hash IN (${receiptList})
          )
      )`
    : sql`1 = 1`;

  const insertSelection = db.run(sql`
    INSERT OR IGNORE INTO photo_review_selections (
      model,
      year,
      color_id,
      candidate_ids_json,
      status,
      attempt_count,
      created_at
    )
    SELECT
      ${context.model},
      ${context.year},
      ${context.colorId},
      ${candidateIdsJson},
      'queued',
      0,
      CURRENT_TIMESTAMP
    WHERE ${receiptEligibility}
      AND ${noActiveCandidateOverlap}
  `);
  const consumedAt = new Date().toISOString();
  const consumeReceipts = receiptHashes.length
    ? db
        .update(photoUploadReceipts)
        .set({ consumedAt })
        .where(
          and(
            inArray(photoUploadReceipts.receiptHash, receiptHashes),
            isNull(photoUploadReceipts.consumedAt),
            sql`datetime(${photoUploadReceipts.createdAt}) >= datetime(${receiptCutoff})`,
            sql`EXISTS (
              SELECT 1
              FROM ${photoReviewSelections}
              WHERE ${photoReviewSelections.model} = ${context.model}
                AND ${photoReviewSelections.year} = ${context.year}
                AND ${photoReviewSelections.colorId} = ${context.colorId}
                AND ${photoReviewSelections.candidateIdsJson} = ${candidateIdsJson}
                AND ${photoReviewSelections.status} != 'failed'
            )`,
          ),
        )
        .returning({ receiptHash: photoUploadReceipts.receiptHash })
    : null;

  let created = false;
  let batchError: unknown;
  try {
    if (consumeReceipts) {
      const [insertResult] = await db.batch([insertSelection, consumeReceipts]);
      created = Number(insertResult.meta?.changes ?? 0) > 0;
    } else {
      const [insertResult] = await db.batch([insertSelection]);
      created = Number(insertResult.meta?.changes ?? 0) > 0;
    }
  } catch (error) {
    // D1 batch responses can be ambiguous after a transport failure. The
    // active canonical selection below is the idempotency record.
    batchError = error;
  }

  const active = await findActiveSelection(context, candidateIdsJson);
  if (active) return { id: active.id, created };
  if (batchError) throw batchError;
  return null;
}

async function findActiveSelection(
  context: {
    model: string;
    year: string;
    colorId: string;
  },
  candidateIdsJson: string,
): Promise<{ id: number } | undefined> {
  const active = await getDb()
    .select({ id: photoReviewSelections.id })
    .from(photoReviewSelections)
    .where(
      and(
        eq(photoReviewSelections.model, context.model),
        eq(photoReviewSelections.year, context.year),
        eq(photoReviewSelections.colorId, context.colorId),
        eq(photoReviewSelections.candidateIdsJson, candidateIdsJson),
        sql`${photoReviewSelections.status} != 'failed'`,
      ),
    )
    .orderBy(desc(photoReviewSelections.id))
    .limit(1);
  return active[0];
}

export async function PATCH(request: Request) {
  const unauthorized = await requireQueueAuthorization(request);
  if (unauthorized) return unauthorized;

  const contentLength = request.headers.get("content-length");
  if (!contentLength) {
    return jsonResponse(
      request,
      { error: "A bounded Content-Length header is required." },
      { status: 411 },
    );
  }
  if (
    (!/^\d+$/.test(contentLength) || Number(contentLength) > maxJsonBytes)
  ) {
    return jsonResponse(
      request,
      { error: "The queue request is too large." },
      { status: 413 },
    );
  }

  let payload: QueuePatch;
  try {
    const parsed: unknown = await request.json();
    if (!isPlainRecord(parsed)) throw new Error("Expected a JSON object.");
    payload = parsed;
  } catch {
    return jsonResponse(request, { error: "Invalid JSON." }, { status: 400 });
  }
  if (
    Object.prototype.hasOwnProperty.call(payload, "error") ||
    Object.prototype.hasOwnProperty.call(payload, "lastError")
  ) {
    return jsonResponse(
      request,
      { error: "Free-form queue errors are not accepted." },
      { status: 400 },
    );
  }

  if (payload.action === "claim") {
    return claimNextSelection(request, payload.leaseSeconds);
  }
  if (payload.action === "ack") {
    return acknowledgeSelection(request, payload);
  }
  return jsonResponse(
    request,
    { error: "action must be claim or ack." },
    { status: 400 },
  );
}

async function claimNextSelection(request: Request, rawLeaseSeconds: unknown) {
  const leaseSeconds = parseBoundedInteger(rawLeaseSeconds, 300, 60, 1800);
  const now = new Date();
  const nowIso = now.toISOString();
  const expiresAt = new Date(now.getTime() + leaseSeconds * 1000).toISOString();
  const db = getDb();
  await purgePendingRejectedObjects().catch(() => undefined);
  await cleanupExpiredUploadReceipts().catch(() => undefined);
  await db
    .update(photoReviewSelections)
    .set({
      status: "failed",
      leaseTokenHash: null,
      leaseExpiresAt: null,
      lastErrorCode: "lease_expired_max_attempts",
    })
    .where(
      and(
        eq(photoReviewSelections.status, "leased"),
        lt(photoReviewSelections.leaseExpiresAt, nowIso),
        gte(photoReviewSelections.attemptCount, maxQueueAttempts),
      ),
    );
  const candidates = await db
    .select()
    .from(photoReviewSelections)
    .where(
      and(
        lt(photoReviewSelections.attemptCount, maxQueueAttempts),
        or(
          eq(photoReviewSelections.status, "queued"),
          and(
            eq(photoReviewSelections.status, "leased"),
            lt(photoReviewSelections.leaseExpiresAt, nowIso),
          ),
        ),
      ),
    )
    .orderBy(asc(photoReviewSelections.id))
    .limit(10);

  for (const candidate of candidates) {
    const leaseToken = createOpaqueToken();
    const leaseTokenHash = await sha256Hex(leaseToken);
    const leased = await db
      .update(photoReviewSelections)
      .set({
        status: "leased",
        leaseTokenHash,
        leaseExpiresAt: expiresAt,
        attemptCount: sql`${photoReviewSelections.attemptCount} + 1`,
      })
      .where(
        and(
          eq(photoReviewSelections.id, candidate.id),
          lt(photoReviewSelections.attemptCount, maxQueueAttempts),
          or(
            eq(photoReviewSelections.status, "queued"),
            and(
              eq(photoReviewSelections.status, "leased"),
              lt(photoReviewSelections.leaseExpiresAt, nowIso),
            ),
          ),
        ),
      )
      .returning();
    if (leased[0]) {
      try {
        const hydrated = await hydrateSelections([leased[0]], request);
        const storedCandidateIds = parseStoredCandidateIds(
          leased[0].candidateIdsJson,
        );
        if (
          !hydrated[0] ||
          !storedCandidateIds.length ||
          hydrated[0].candidates.length !== storedCandidateIds.length
        ) {
          throw new Error(
            "The claimed selection does not contain every stored candidate.",
          );
        }
        return jsonResponse(request, {
          leaseToken,
          selection: hydrated[0],
        });
      } catch {
        const terminal = leased[0].attemptCount >= maxQueueAttempts;
        await db
          .update(photoReviewSelections)
          .set({
            status: terminal ? "failed" : "queued",
            leaseTokenHash: null,
            leaseExpiresAt: null,
            lastErrorCode: "claim_hydration_failed",
          })
          .where(
            and(
              eq(photoReviewSelections.id, leased[0].id),
              eq(photoReviewSelections.status, "leased"),
              eq(photoReviewSelections.leaseTokenHash, leaseTokenHash),
            ),
          );
        return jsonResponse(
          request,
          { error: "The queue claim could not be hydrated and was released." },
          { status: 503 },
        );
      }
    }
  }

  return jsonResponse(request, { leaseToken: null, selection: null });
}

async function acknowledgeSelection(
  request: Request,
  payload: QueuePatch,
) {
  const selectionId = Number(payload.selectionId);
  const leaseToken =
    typeof payload.leaseToken === "string" ? payload.leaseToken : "";
  const outcome = payload.outcome;
  const errorCode =
    payload.errorCode === undefined && outcome === "processed"
      ? null
      : isQueueErrorCode(payload.errorCode)
        ? payload.errorCode
        : null;
  const rejectedCandidateIds = parseCandidateIds(payload.rejectedCandidateIds);
  const publishedAssets = parsePublishedAssetMappings(payload.publishedAssets);
  if (
    !Number.isSafeInteger(selectionId) ||
    selectionId < 1 ||
    !isReceiptToken(leaseToken) ||
    !["processed", "retry", "failed"].includes(String(outcome)) ||
    rejectedCandidateIds === null ||
    publishedAssets === null ||
    (outcome !== "processed" && !errorCode) ||
    (outcome === "processed" &&
      (errorCode || rejectedCandidateIds.length || !publishedAssets.length)) ||
    (outcome !== "processed" && publishedAssets.length > 0) ||
    (errorCode === "rights_review_rejected" &&
      (outcome !== "failed" || !rejectedCandidateIds.length)) ||
    (errorCode !== "rights_review_rejected" && rejectedCandidateIds.length > 0)
  ) {
    return jsonResponse(
      request,
      { error: "Invalid queue acknowledgment." },
      { status: 400 },
    );
  }

  const leaseTokenHash = await sha256Hex(leaseToken);
  const nowIso = new Date().toISOString();
  const db = getDb();
  const currentRows = await db
    .select()
    .from(photoReviewSelections)
    .where(
      and(
        eq(photoReviewSelections.id, selectionId),
        eq(photoReviewSelections.status, "leased"),
        eq(photoReviewSelections.leaseTokenHash, leaseTokenHash),
        gt(photoReviewSelections.leaseExpiresAt, nowIso),
      ),
    )
    .limit(1);
  const current = currentRows[0];
  if (!current) {
    return jsonResponse(
      request,
      { error: "The lease is invalid or expired." },
      { status: 409 },
    );
  }

  const candidateIds = parseStoredCandidateIds(current.candidateIdsJson);
  if (
    !candidateIds.length ||
    rejectedCandidateIds.some((id) => !candidateIds.includes(id))
  ) {
    return jsonResponse(
      request,
      { error: "The queue item contains invalid candidate state." },
      { status: 409 },
    );
  }
  if (
    outcome === "processed" &&
    (publishedAssets.length !== candidateIds.length ||
      publishedAssets.some(
        (asset) => !candidateIds.includes(asset.candidateId),
      ))
  ) {
    return jsonResponse(
      request,
      {
        error:
          "Processed acknowledgment must map every selection candidate exactly once.",
      },
      { status: 400 },
    );
  }

  if (outcome === "processed") {
    const candidateContentRows = await db
      .select({
        id: photoCandidates.id,
        contentType: photoCandidates.contentType,
      })
      .from(photoCandidates)
      .where(
        and(
          inArray(photoCandidates.id, candidateIds),
          eq(photoCandidates.model, current.model),
          eq(photoCandidates.year, current.year),
          eq(photoCandidates.colorId, current.colorId),
        ),
      );
    const contentTypeById = new Map(
      candidateContentRows.map((candidate) => [
        candidate.id,
        candidate.contentType,
      ]),
    );
    if (
      candidateContentRows.length !== candidateIds.length ||
      publishedAssets.some((asset) => {
        const extension = publishedAssetExtension(
          contentTypeById.get(asset.candidateId),
        );
        return (
          !extension ||
          asset.publishedAssetPath !==
            `${PUBLISHED_ASSET_ROOT}/${asset.publishedSha256}.${extension}`
        );
      })
    ) {
      return jsonResponse(
        request,
        {
          error:
            "Published asset paths must match each candidate's reviewed image type.",
        },
        { status: 400 },
      );
    }
  }

  const requestedOutcome = String(outcome);
  const nextStatus =
    requestedOutcome === "processed"
      ? "processed"
      : requestedOutcome === "failed" ||
          current.attemptCount >= maxQueueAttempts
        ? "failed"
        : "queued";
  const validLease = and(
    eq(photoReviewSelections.id, selectionId),
    eq(photoReviewSelections.status, "leased"),
    eq(photoReviewSelections.leaseTokenHash, leaseTokenHash),
    gt(photoReviewSelections.leaseExpiresAt, nowIso),
  );
  const candidateIdList = sql.join(
    candidateIds.map((id) => sql`${id}`),
    sql`, `,
  );
  const updateSelection = db
    .update(photoReviewSelections)
    .set({
      status: nextStatus,
      leaseTokenHash: null,
      leaseExpiresAt: null,
      lastErrorCode: nextStatus === "processed" ? null : errorCode,
      processedAt: nextStatus === "processed" ? nowIso : null,
    })
    .where(validLease)
    .returning({ id: photoReviewSelections.id });

  let updated: { id: number }[] = [];
  if (nextStatus === "processed") {
    const publishedAssetsJson = JSON.stringify(publishedAssets);
    const publicationMappingRows = sql`
      SELECT
        CAST(json_extract(value, '$.candidateId') AS INTEGER) AS candidate_id,
        json_extract(value, '$.publishedSha256') AS published_sha256,
        json_extract(value, '$.publishedAssetPath') AS published_asset_path
      FROM json_each(${publishedAssetsJson})
    `;
    const publicationEligibility = sql`(
      SELECT COUNT(*)
      FROM ${photoCandidates} AS candidate
      INNER JOIN (${publicationMappingRows}) AS mapping
        ON candidate.id = mapping.candidate_id
      WHERE candidate.model = ${current.model}
        AND candidate.year = ${current.year}
        AND candidate.color_id = ${current.colorId}
        AND (
          candidate.status IN ('staged', 'approved')
          OR (
            candidate.status = 'published'
            AND candidate.published_sha256 = mapping.published_sha256
            AND candidate.published_asset_path = mapping.published_asset_path
          )
        )
    ) = ${candidateIds.length}`;
    const publishCandidates = db.run(sql`
      UPDATE ${photoCandidates}
      SET
        status = 'published',
        rejected_at = NULL,
        published_sha256 = (
          SELECT mapping.published_sha256
          FROM (${publicationMappingRows}) AS mapping
          WHERE mapping.candidate_id = ${photoCandidates.id}
        ),
        published_asset_path = (
          SELECT mapping.published_asset_path
          FROM (${publicationMappingRows}) AS mapping
          WHERE mapping.candidate_id = ${photoCandidates.id}
        ),
        published_at = ${nowIso}
      WHERE ${photoCandidates.id} IN (${candidateIdList})
        AND ${photoCandidates.model} = ${current.model}
        AND ${photoCandidates.year} = ${current.year}
        AND ${photoCandidates.colorId} = ${current.colorId}
        AND EXISTS (
          SELECT 1
          FROM ${photoReviewSelections}
          WHERE ${validLease}
        )
        AND ${publicationEligibility}
    `);
    const guardedSelectionUpdate = db
      .update(photoReviewSelections)
      .set({
        status: "processed",
        leaseTokenHash: null,
        leaseExpiresAt: null,
        lastErrorCode: null,
        processedAt: nowIso,
      })
      .where(
        and(
          validLease,
          sql`(
            SELECT COUNT(*)
            FROM ${photoCandidates} AS candidate
            INNER JOIN (${publicationMappingRows}) AS mapping
              ON candidate.id = mapping.candidate_id
            WHERE candidate.status = 'published'
              AND candidate.model = ${current.model}
              AND candidate.year = ${current.year}
              AND candidate.color_id = ${current.colorId}
              AND candidate.published_sha256 = mapping.published_sha256
              AND candidate.published_asset_path = mapping.published_asset_path
              AND candidate.published_at IS NOT NULL
          ) = ${candidateIds.length}`,
        ),
      )
      .returning({ id: photoReviewSelections.id });
    [, updated] = await db.batch([
      publishCandidates,
      guardedSelectionUpdate,
    ]);
  } else if (errorCode === "rights_review_rejected") {
    const rejectedCandidateIdList = sql.join(
      rejectedCandidateIds.map((id) => sql`${id}`),
      sql`, `,
    );
    const rejectCandidates = db
      .update(photoCandidates)
      .set({
        status: "rejected",
        rejectedAt: nowIso,
        objectPurgedAt: null,
      })
      .where(
        and(
          inArray(photoCandidates.id, rejectedCandidateIds),
          inArray(photoCandidates.status, ["staged", "approved"]),
          eq(photoCandidates.model, current.model),
          eq(photoCandidates.year, current.year),
          eq(photoCandidates.colorId, current.colorId),
          sql`EXISTS (
            SELECT 1
            FROM ${photoReviewSelections}
            WHERE ${validLease}
          )`,
          sql`(
            SELECT COUNT(*)
            FROM ${photoCandidates}
            WHERE ${photoCandidates.id} IN (${rejectedCandidateIdList})
              AND ${photoCandidates.status} IN ('staged', 'approved')
              AND ${photoCandidates.model} = ${current.model}
              AND ${photoCandidates.year} = ${current.year}
              AND ${photoCandidates.colorId} = ${current.colorId}
          ) = ${rejectedCandidateIds.length}`,
        ),
      );
    const guardedRejectionUpdate = db
      .update(photoReviewSelections)
      .set({
        status: nextStatus,
        leaseTokenHash: null,
        leaseExpiresAt: null,
        lastErrorCode: errorCode,
        processedAt: null,
      })
      .where(
        and(
          validLease,
          sql`(
            SELECT COUNT(*)
            FROM ${photoCandidates}
            WHERE ${photoCandidates.id} IN (${rejectedCandidateIdList})
              AND ${photoCandidates.status} = 'rejected'
              AND ${photoCandidates.model} = ${current.model}
              AND ${photoCandidates.year} = ${current.year}
              AND ${photoCandidates.colorId} = ${current.colorId}
          ) = ${rejectedCandidateIds.length}`,
        ),
      )
      .returning({ id: photoReviewSelections.id });
    [, updated] = await db.batch([
      rejectCandidates,
      guardedRejectionUpdate,
    ]);
  } else {
    updated = await updateSelection;
  }

  if (!updated[0]) {
    return jsonResponse(
      request,
      {
        error:
          nextStatus === "processed"
            ? "The lease or candidate publication state changed before acknowledgment."
            : "The lease changed before acknowledgment.",
      },
      { status: 409 },
    );
  }

  return jsonResponse(request, {
    ok: true,
    status: nextStatus,
    purgedObjects: 0,
    purgePending:
      errorCode === "rights_review_rejected"
        ? rejectedCandidateIds.length
        : 0,
  });
}

async function purgeCandidateObjects(
  candidateIds: number[],
  rejectedBefore: string,
): Promise<{ purged: number; pending: number }> {
  if (!candidateIds.length) return { purged: 0, pending: 0 };
  const db = getDb();
  const candidates = await db
    .select({
      id: photoCandidates.id,
      objectKey: photoCandidates.objectKey,
    })
    .from(photoCandidates)
    .where(
      and(
        inArray(photoCandidates.id, candidateIds),
        eq(photoCandidates.status, "rejected"),
        lt(photoCandidates.rejectedAt, rejectedBefore),
        isNull(photoCandidates.objectPurgedAt),
      ),
    );
  const bucket = getArchiveEnv().UPLOADS;
  if (!bucket) return { purged: 0, pending: candidates.length };

  const purgedIds: number[] = [];
  for (const candidate of candidates) {
    try {
      await bucket.delete(candidate.objectKey);
      purgedIds.push(candidate.id);
    } catch {
      // Leave object_purged_at null. The next publisher claim retries it.
    }
  }
  if (purgedIds.length) {
    await db
      .update(photoCandidates)
      .set({ objectPurgedAt: new Date().toISOString() })
      .where(
        and(
          inArray(photoCandidates.id, purgedIds),
          eq(photoCandidates.status, "rejected"),
          lt(photoCandidates.rejectedAt, rejectedBefore),
          isNull(photoCandidates.objectPurgedAt),
        ),
      );
  }
  return {
    purged: purgedIds.length,
    pending: candidates.length - purgedIds.length,
  };
}

async function purgePendingRejectedObjects(): Promise<void> {
  const rejectedBefore = new Date(
    Date.now() - rejectedObjectPurgeGraceSeconds * 1000,
  ).toISOString();
  const candidates = await getDb()
    .select({ id: photoCandidates.id })
    .from(photoCandidates)
    .where(
      and(
        eq(photoCandidates.status, "rejected"),
        lt(photoCandidates.rejectedAt, rejectedBefore),
        isNull(photoCandidates.objectPurgedAt),
      ),
    )
    .orderBy(asc(photoCandidates.id))
    .limit(25);
  await purgeCandidateObjects(
    candidates.map((candidate) => candidate.id),
    rejectedBefore,
  );
}

async function cleanupExpiredUploadReceipts(): Promise<void> {
  const deleteBefore = new Date(
    Date.now() -
      (UPLOAD_RECEIPT_TTL_SECONDS + expiredReceiptGraceSeconds) * 1000,
  ).toISOString();
  await getDb().run(sql`
    DELETE FROM ${photoUploadReceipts}
    WHERE ${photoUploadReceipts.receiptHash} IN (
      SELECT ${photoUploadReceipts.receiptHash}
      FROM ${photoUploadReceipts}
      WHERE datetime(${photoUploadReceipts.createdAt}) < datetime(${deleteBefore})
      ORDER BY ${photoUploadReceipts.createdAt}, ${photoUploadReceipts.receiptHash}
      LIMIT 100
    )
  `);
}

async function hydrateSelections(
  rows: (typeof photoReviewSelections.$inferSelect)[],
  request: Request,
) {
  const parsed = rows.map((row) => ({
    row,
    candidateIds: parseStoredCandidateIds(row.candidateIdsJson),
  }));
  const allIds = [...new Set(parsed.flatMap((entry) => entry.candidateIds))];
  const candidates = allIds.length
    ? await getDb()
        .select()
        .from(photoCandidates)
        .where(inArray(photoCandidates.id, allIds))
    : [];
  const candidatesById = new Map(candidates.map((entry) => [entry.id, entry]));

  return parsed.map(({ row, candidateIds }) => ({
    id: row.id,
    model: row.model,
    year: row.year,
    colorId: row.colorId,
    status: row.status,
    attemptCount: row.attemptCount,
    leaseExpiresAt: row.leaseExpiresAt,
    lastErrorCode: row.lastErrorCode,
    createdAt: row.createdAt,
    processedAt: row.processedAt,
    candidates: candidateIds
      .map((id) => candidatesById.get(id))
      .filter((entry): entry is typeof photoCandidates.$inferSelect =>
        Boolean(entry),
      )
      .map((entry) => ({
        id: entry.id,
        model: entry.model,
        year: entry.year,
        colorId: entry.colorId,
        colorName: entry.colorName,
        sourceKind: entry.sourceKind,
        originalUrl: entry.originalUrl,
        fileName: entry.fileName,
        contentType: entry.contentType,
        sizeBytes: entry.sizeBytes,
        credit: entry.credit,
        license: entry.license,
        status: entry.status,
        sha256: entry.sha256,
        publishedSha256: entry.publishedSha256,
        publishedAssetPath: entry.publishedAssetPath,
        publishedAt: entry.publishedAt,
        downloadUrl: new URL(`/api/photos/${entry.id}`, request.url).toString(),
      })),
  }));
}

function parseCandidateIds(value: unknown): number[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return null;
  if (
    value.some(
      (entry) =>
        typeof entry !== "number" ||
        !Number.isSafeInteger(entry) ||
        entry < 1,
    )
  ) {
    return null;
  }
  return [...new Set(value)];
}

function parseReceipts(value: unknown): string[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some((entry) => !isReceiptToken(entry))) {
    return null;
  }
  return [...new Set(value)];
}

function parseStoredCandidateIds(value: string): number[] {
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return [
      ...new Set(
        parsed
          .map(Number)
          .filter(
            (entry) => Number.isSafeInteger(entry) && Number(entry) > 0,
          ),
      ),
    ];
  } catch {
    return [];
  }
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

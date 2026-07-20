import { and, desc, eq, inArray, isNotNull, lt, sql } from "drizzle-orm";
import { models } from "../../archive-data";
import { getDb } from "../../../db";
import { photoCandidates, photoUploadReceipts } from "../../../db/schema";
import {
  createOpaqueToken,
  detectImageMime,
  MAX_MULTIPART_BYTES,
  MAX_UPLOAD_BYTES,
  normalizeCredit,
  normalizeRights,
  parseBoundedInteger,
  publishedAssetUrl,
  PUBLIC_PHOTO_STATUSES,
  resolveArchiveContext,
  sanitizeFileName,
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
} from "../server-controls";

export const runtime = "edge";

const allowedDeclaredTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

function publicPhoto(row: typeof photoCandidates.$inferSelect) {
  const imageUrl = publishedAssetUrl(
    row.publishedSha256,
    row.publishedAssetPath,
    row.contentType,
  );
  if (!imageUrl) return null;
  return {
    id: row.id,
    model: row.model,
    year: row.year,
    colorId: row.colorId,
    colorName: row.colorName,
    sourceKind: row.sourceKind,
    fileName: row.fileName,
    contentType: row.contentType,
    sizeBytes: row.sizeBytes,
    credit: row.credit,
    license: row.license,
    status: row.status,
    createdAt: row.createdAt,
    publishedSha256: row.publishedSha256,
    publishedAt: row.publishedAt,
    imageUrl,
  };
}

export function OPTIONS(request: Request) {
  return corsPreflight(request, ["GET", "POST", "OPTIONS"]);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const context = resolveArchiveContext(
    models,
    url.searchParams.get("model"),
    url.searchParams.get("year"),
    url.searchParams.get("color_id"),
  );
  if (!context) {
    return jsonResponse(
      request,
      { error: "A published model, year, and color record are required." },
      { status: 400 },
    );
  }

  const limit = parseBoundedInteger(
    url.searchParams.get("limit"),
    24,
    1,
    50,
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

  try {
    const publicFilter = and(
      eq(photoCandidates.model, context.model),
      eq(photoCandidates.year, context.year),
      eq(photoCandidates.colorId, context.colorId),
      inArray(photoCandidates.status, [...PUBLIC_PHOTO_STATUSES]),
      isNotNull(photoCandidates.publishedSha256),
      isNotNull(photoCandidates.publishedAssetPath),
      isNotNull(photoCandidates.publishedAt),
    );
    const rows = await getDb()
      .select()
      .from(photoCandidates)
      .where(
        cursor
          ? and(publicFilter, lt(photoCandidates.id, cursor))
          : publicFilter,
      )
      .orderBy(desc(photoCandidates.id))
      .limit(limit + 1);
    const hasMore = rows.length > limit;
    const page = rows.slice(0, limit);
    return jsonResponse(request, {
      items: page
        .map((row) => publicPhoto(row))
        .filter((row): row is NonNullable<typeof row> => Boolean(row)),
      nextCursor: hasMore ? page.at(-1)?.id ?? null : null,
    });
  } catch {
    return jsonResponse(
      request,
      { error: "Photo storage is temporarily unavailable." },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  if (!isAllowedBrowserOrigin(request)) {
    return jsonResponse(request, { error: "Origin not allowed." }, { status: 403 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("multipart/form-data;")) {
    return jsonResponse(
      request,
      { error: "Use multipart form data." },
      { status: 415 },
    );
  }
  const contentLength = request.headers.get("content-length");
  if (!contentLength || !/^\d+$/.test(contentLength)) {
    return jsonResponse(
      request,
      { error: "A bounded Content-Length header is required." },
      { status: 411 },
    );
  }
  if (Number(contentLength) > MAX_MULTIPART_BYTES) {
    return jsonResponse(
      request,
      { error: "The upload request exceeds 8 MB." },
      { status: 413 },
    );
  }

  try {
    await enforceSubmissionRateLimit(request, "photo-upload");
  } catch (error) {
    const controlled = apiControlErrorResponse(request, error);
    if (controlled) return controlled;
    return jsonResponse(
      request,
      { error: "Submission protection is temporarily unavailable." },
      { status: 503 },
    );
  }

  const bucket = getArchiveEnv().UPLOADS;
  if (!bucket) {
    return jsonResponse(
      request,
      { error: "Upload storage is unavailable." },
      { status: 503 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonResponse(
      request,
      { error: "The upload form could not be parsed." },
      { status: 400 },
    );
  }

  const photo = form.get("photo");
  const context = resolveArchiveContext(
    models,
    form.get("model"),
    form.get("year"),
    form.get("colorId"),
  );
  const credit = normalizeCredit(form.get("credit"));
  const license = normalizeRights(form.get("license"));

  if (!(photo instanceof File)) {
    return jsonResponse(
      request,
      { error: "Choose an image file." },
      { status: 400 },
    );
  }
  if (!context) {
    return jsonResponse(
      request,
      { error: "Choose a published model, year, and color record." },
      { status: 400 },
    );
  }
  if (!credit || !license) {
    return jsonResponse(
      request,
      { error: "A valid credit and rights selection are required." },
      { status: 400 },
    );
  }
  if (!allowedDeclaredTypes.has(photo.type)) {
    return jsonResponse(
      request,
      { error: "Upload a JPEG, PNG, GIF, or WebP image." },
      { status: 415 },
    );
  }
  if (photo.size < 1 || photo.size > MAX_UPLOAD_BYTES) {
    return jsonResponse(
      request,
      { error: "The image must be between 1 byte and 8 MB." },
      { status: 413 },
    );
  }

  const bytes = await photo.arrayBuffer();
  const detectedType = detectImageMime(bytes);
  if (!detectedType || detectedType !== photo.type) {
    return jsonResponse(
      request,
      { error: "The file bytes do not match the declared image type." },
      { status: 415 },
    );
  }

  const sha256 = await sha256Hex(bytes);
  const safeName = sanitizeFileName(photo.name);
  const db = getDb();
  const duplicate = await findContextDuplicate(
    context.model,
    context.year,
    context.colorId,
    sha256,
  );
  if (duplicate?.status === "rejected") {
    return jsonResponse(
      request,
      { error: "This photograph was previously rejected for this record." },
      { status: 409 },
    );
  }
  if (duplicate) {
    let currentDuplicate = duplicate;
    if (!(await bucket.head(duplicate.objectKey))) {
      await putPhotoObject(bucket, duplicate.objectKey, bytes, {
        ...context,
        credit,
        license,
        sha256,
        contentType: detectedType,
      });
      await db
        .update(photoCandidates)
        .set({ objectPurgedAt: null })
        .where(
          and(
            eq(photoCandidates.id, duplicate.id),
            inArray(photoCandidates.status, [
              "staged",
              "approved",
              "published",
            ]),
          ),
        );
      const restored = await findContextDuplicate(
        context.model,
        context.year,
        context.colorId,
        sha256,
      );
      if (!restored || restored.status === "rejected") {
        await deleteObjectQuietly(bucket, duplicate.objectKey);
        return jsonResponse(
          request,
          { error: "This photograph was rejected while it was being restored." },
          { status: 409 },
        );
      }
      currentDuplicate = restored;
    }
    if (currentDuplicate.status === "published") {
      return alreadyPublishedResponse(request, currentDuplicate);
    }
    if (currentDuplicate.status !== "staged") {
      return jsonResponse(
        request,
        {
          error:
            "This photograph is already in publisher review and cannot receive another staged receipt.",
        },
        { status: 409 },
      );
    }
    try {
      const receipt = await issueReceipt(currentDuplicate.id);
      return stagedReceiptResponse(
        request,
        currentDuplicate,
        receipt,
        currentDuplicate.status,
        200,
      );
    } catch (error) {
      return jsonResponse(
        request,
        {
          error:
            error instanceof CandidateRejectedError
              ? "This photograph was rejected while a fresh receipt was being issued."
              : "A fresh selection receipt could not be issued. Re-upload the exact file to retry.",
        },
        { status: error instanceof CandidateRejectedError ? 409 : 503 },
      );
    }
  }

  const objectKey = [
    "staged",
    context.model,
    context.year,
    context.colorId,
    `${sha256}.${extensionForMime(detectedType)}`,
  ].join("/");
  await putPhotoObject(bucket, objectKey, bytes, {
    ...context,
    credit,
    license,
    sha256,
    contentType: detectedType,
  });

  let staged:
    | {
        candidate: typeof photoCandidates.$inferSelect;
        receipt: IssuedReceipt;
      }
    | undefined;
  try {
    staged = await indexCandidateAndIssueReceipt({
      candidate: {
        model: context.model,
        year: context.year,
        colorId: context.colorId,
        colorName: context.colorName,
        objectKey,
        fileName: safeName,
        contentType: detectedType,
        sizeBytes: photo.size,
        credit,
        license,
        sha256,
      },
    });
  } catch (error) {
    const reconciled = await findContextDuplicate(
      context.model,
      context.year,
      context.colorId,
      sha256,
    ).catch(() => undefined);
    if (reconciled && reconciled.status !== "rejected") {
      try {
        staged = {
          candidate: reconciled,
          receipt: await issueReceipt(reconciled.id),
        };
      } catch {
        // The candidate remains private and can be recovered by an exact-byte
        // re-upload. Do not delete an object that an ambiguous D1 commit may
        // already reference.
      }
    }
    if (!staged) {
      if (
        reconciled?.status === "rejected" ||
        (reconciled?.objectKey && reconciled.objectKey !== objectKey)
      ) {
        await deleteObjectQuietly(bucket, objectKey);
      }
      const message =
        error instanceof CandidateRejectedError ||
        reconciled?.status === "rejected"
          ? "This photograph was rejected while it was being staged."
          : "The photograph remains private, but a selection receipt could not be issued. Re-upload the exact file to recover it.";
      return jsonResponse(
        request,
        { error: message, retryable: !(error instanceof CandidateRejectedError) },
        { status: error instanceof CandidateRejectedError ? 409 : 503 },
      );
    }
  }

  if (staged.candidate.objectKey !== objectKey) {
    await deleteObjectQuietly(bucket, objectKey);
  }
  const finalCandidate = await findContextDuplicate(
    context.model,
    context.year,
    context.colorId,
    sha256,
  ).catch(() => undefined);
  if (finalCandidate?.status === "published") {
    return alreadyPublishedResponse(request, finalCandidate);
  }
  if (!finalCandidate || finalCandidate.status !== "staged") {
    return jsonResponse(
      request,
      {
        error:
          "The photograph changed review state before its staged receipt could be returned.",
      },
      { status: 409 },
    );
  }
  try {
    return stagedReceiptResponse(
      request,
      finalCandidate,
      staged.receipt,
      staged.candidate.status,
      201,
    );
  } catch {
    return jsonResponse(
      request,
      {
        error:
          "The photograph was staged, but a selection receipt could not be issued.",
      },
      { status: 503 },
    );
  }
}

async function findContextDuplicate(
  model: string,
  year: string,
  colorId: string,
  sha256: string,
) {
  const rows = await getDb()
    .select()
    .from(photoCandidates)
    .where(
      and(
        eq(photoCandidates.model, model),
        eq(photoCandidates.year, year),
        eq(photoCandidates.colorId, colorId),
        eq(photoCandidates.sha256, sha256),
      ),
    )
    .limit(1);
  return rows[0];
}

class CandidateRejectedError extends Error {
  constructor() {
    super("The candidate is rejected.");
    this.name = "CandidateRejectedError";
  }
}

async function indexCandidateAndIssueReceipt({
  candidate,
}: {
  candidate: typeof photoCandidates.$inferInsert;
}): Promise<{
  candidate: typeof photoCandidates.$inferSelect;
  receipt: IssuedReceipt;
}> {
  const db = getDb();
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const receipt = createOpaqueToken();
    const receiptHash = await sha256Hex(receipt);
    const insertCandidate = db
      .insert(photoCandidates)
      .values(candidate)
      .onConflictDoNothing();
    const insertReceipt = db.insert(photoUploadReceipts).values({
      receiptHash,
      candidateId: sql<number>`(
        SELECT ${photoCandidates.id}
        FROM ${photoCandidates}
        WHERE ${photoCandidates.model} = ${candidate.model}
          AND ${photoCandidates.year} = ${candidate.year}
          AND ${photoCandidates.colorId} = ${candidate.colorId}
          AND ${photoCandidates.sha256} = ${candidate.sha256}
          AND ${photoCandidates.status} = 'staged'
        LIMIT 1
      )`,
    });

    try {
      await db.batch([insertCandidate, insertReceipt]);
    } catch {
      const recovered = await findReceiptCandidate(receiptHash).catch(
        () => undefined,
      );
      if (
        recovered &&
        recovered.candidate.model === candidate.model &&
        recovered.candidate.year === candidate.year &&
        recovered.candidate.colorId === candidate.colorId &&
        recovered.candidate.sha256 === candidate.sha256 &&
        recovered.candidate.status === "staged"
      ) {
        return {
          candidate: recovered.candidate,
          receipt: issuedReceipt(receipt, recovered.createdAt),
        };
      }
      const duplicate = await findContextDuplicate(
        candidate.model,
        candidate.year,
        candidate.colorId,
        candidate.sha256,
      ).catch(() => undefined);
      if (duplicate?.status === "rejected") {
        throw new CandidateRejectedError();
      }
      continue;
    }

    const indexed = await findReceiptCandidate(receiptHash);
    if (
      indexed &&
      indexed.candidate.model === candidate.model &&
      indexed.candidate.year === candidate.year &&
      indexed.candidate.colorId === candidate.colorId &&
      indexed.candidate.sha256 === candidate.sha256 &&
      indexed.candidate.status === "staged"
    ) {
      return {
        candidate: indexed.candidate,
        receipt: issuedReceipt(receipt, indexed.createdAt),
      };
    }
  }
  throw new Error("Could not atomically index the upload and its receipt.");
}

async function findReceiptCandidate(
  receiptHash: string,
): Promise<
  | {
      candidate: typeof photoCandidates.$inferSelect;
      createdAt: string;
    }
  | undefined
> {
  const receiptRows = await getDb()
    .select({
      candidateId: photoUploadReceipts.candidateId,
      createdAt: photoUploadReceipts.createdAt,
    })
    .from(photoUploadReceipts)
    .where(eq(photoUploadReceipts.receiptHash, receiptHash))
    .limit(1);
  const candidateId = receiptRows[0]?.candidateId;
  if (!candidateId) return undefined;
  const candidateRows = await getDb()
    .select()
    .from(photoCandidates)
    .where(eq(photoCandidates.id, candidateId))
    .limit(1);
  return candidateRows[0]
    ? { candidate: candidateRows[0], createdAt: receiptRows[0].createdAt }
    : undefined;
}

type IssuedReceipt = {
  value: string;
  expiresAt: string;
};

async function issueReceipt(candidateId: number): Promise<IssuedReceipt> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const receipt = createOpaqueToken();
    const receiptHash = await sha256Hex(receipt);
    try {
      const inserted = await getDb()
        .insert(photoUploadReceipts)
        .values({
          receiptHash,
          candidateId: sql<number>`(
            SELECT ${photoCandidates.id}
            FROM ${photoCandidates}
            WHERE ${photoCandidates.id} = ${candidateId}
              AND ${photoCandidates.status} = 'staged'
            LIMIT 1
          )`,
        })
        .returning({ createdAt: photoUploadReceipts.createdAt });
      if (inserted[0]) {
        return issuedReceipt(receipt, inserted[0].createdAt);
      }
    } catch {
      const recovered = await findReceiptCandidate(receiptHash).catch(
        () => undefined,
      );
      if (
        recovered?.candidate.id === candidateId &&
        recovered.candidate.status === "staged"
      ) {
        return issuedReceipt(receipt, recovered.createdAt);
      }
      const candidateRows = await getDb()
        .select({ status: photoCandidates.status })
        .from(photoCandidates)
        .where(eq(photoCandidates.id, candidateId))
        .limit(1)
        .catch(() => []);
      if (candidateRows[0]?.status === "rejected") {
        throw new CandidateRejectedError();
      }
      if (candidateRows[0] && candidateRows[0].status !== "staged") {
        throw new Error("The candidate is no longer staged.");
      }
    }
  }
  throw new Error("Could not issue an upload receipt.");
}

async function deleteObjectQuietly(
  bucket: R2Bucket,
  objectKey: string,
): Promise<boolean> {
  try {
    await bucket.delete(objectKey);
    return true;
  } catch {
    return false;
  }
}

async function putPhotoObject(
  bucket: R2Bucket,
  objectKey: string,
  bytes: ArrayBuffer,
  metadata: {
    model: string;
    year: string;
    colorId: string;
    colorName: string;
    credit: string;
    license: string;
    sha256: string;
    contentType: string;
  },
) {
  await bucket.put(objectKey, bytes, {
    httpMetadata: {
      contentType: metadata.contentType,
      cacheControl: "private, max-age=0, no-store",
    },
    customMetadata: {
      model: metadata.model,
      year: metadata.year,
      colorId: metadata.colorId,
      sha256: metadata.sha256,
    },
  });
}

function stagedReceiptResponse(
  request: Request,
  candidate: typeof photoCandidates.$inferSelect,
  receipt: IssuedReceipt,
  status: string,
  responseStatus: number,
) {
  return jsonResponse(
    request,
    {
      receipt: receipt.value,
      receiptExpiresAt: receipt.expiresAt,
      candidate: candidateSummary(candidate, status),
    },
    { status: responseStatus },
  );
}

function candidateSummary(
  candidate: typeof photoCandidates.$inferSelect,
  status = candidate.status,
) {
  return {
    model: candidate.model,
    year: candidate.year,
    colorId: candidate.colorId,
    colorName: candidate.colorName,
    fileName: candidate.fileName,
    contentType: candidate.contentType,
    sizeBytes: candidate.sizeBytes,
    credit: candidate.credit,
    license: candidate.license,
    status,
  };
}

function alreadyPublishedResponse(
  request: Request,
  candidate: typeof photoCandidates.$inferSelect,
) {
  const imageUrl = publishedAssetUrl(
    candidate.publishedSha256,
    candidate.publishedAssetPath,
    candidate.contentType,
  );
  if (!imageUrl || !candidate.publishedAt) {
    return jsonResponse(
      request,
      {
        error:
          "The published record is not yet bound to a sanitized GitHub asset.",
      },
      { status: 503 },
    );
  }
  return jsonResponse(request, {
    alreadyPublished: true,
    candidate: candidateSummary(candidate),
    publishedSha256: candidate.publishedSha256,
    publishedAt: candidate.publishedAt,
    imageUrl,
  });
}

function issuedReceipt(value: string, createdAt: string): IssuedReceipt {
  const normalizedCreatedAt = /(?:Z|[+-]\d{2}:\d{2})$/.test(createdAt)
    ? createdAt
    : `${createdAt.replace(" ", "T")}Z`;
  const createdAtMs = Date.parse(normalizedCreatedAt);
  if (!Number.isFinite(createdAtMs)) {
    throw new Error("The receipt creation timestamp is invalid.");
  }
  return {
    value,
    expiresAt: new Date(
      createdAtMs + UPLOAD_RECEIPT_TTL_SECONDS * 1000,
    ).toISOString(),
  };
}

function extensionForMime(contentType: string): string {
  if (contentType === "image/jpeg") return "jpg";
  if (contentType === "image/png") return "png";
  if (contentType === "image/gif") return "gif";
  return "webp";
}

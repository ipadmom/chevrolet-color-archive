import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { photoCandidates } from "../../../../db/schema";
import {
  isPublicPhotoStatus,
  publishedAssetUrl,
} from "../../archive-security.mjs";
import {
  applyCorsHeaders,
  corsPreflight,
  getArchiveEnv,
  queueAuthorizationMatches,
} from "../../server-controls";

export const runtime = "edge";

export function OPTIONS(request: Request) {
  return corsPreflight(request, ["GET", "OPTIONS"]);
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: rawId } = await context.params;
  const id = Number(rawId);
  if (!Number.isSafeInteger(id) || id < 1) {
    return new Response("Not found", { status: 404 });
  }

  let row: typeof photoCandidates.$inferSelect | undefined;
  try {
    const rows = await getDb()
      .select()
      .from(photoCandidates)
      .where(eq(photoCandidates.id, id))
      .limit(1);
    row = rows[0];
  } catch {
    return new Response("Storage unavailable", { status: 503 });
  }
  if (!row) return new Response("Not found", { status: 404 });

  const publisherAuthorized = await queueAuthorizationMatches(request);
  if (!publisherAuthorized) {
    const publicUrl = isPublicPhotoStatus(row.status)
      ? publishedAssetUrl(
          row.publishedSha256,
          row.publishedAssetPath,
          row.contentType,
        )
      : null;
    if (!publicUrl || !row.publishedAt) {
      return new Response("Not found", { status: 404 });
    }
    const headers = new Headers({
      "cache-control": "public, max-age=3600",
      location: publicUrl,
      "x-content-type-options": "nosniff",
    });
    applyCorsHeaders(request, headers);
    return new Response(null, { status: 302, headers });
  }

  const bucket = getArchiveEnv().UPLOADS;
  if (!bucket) {
    return new Response("Storage unavailable", { status: 503 });
  }
  if (!row.objectKey) {
    return new Response("Not found", { status: 404 });
  }

  const object = await bucket.get(row.objectKey);
  if (!object) return new Response("Not found", { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("cache-control", "private, max-age=0, no-store");
  headers.set(
    "content-disposition",
    `inline; filename="${row.fileName.replace(/"/g, "")}"`,
  );
  headers.set("etag", object.httpEtag);
  headers.set("x-content-type-options", "nosniff");
  headers.set("content-security-policy", "default-src 'none'; sandbox");
  applyCorsHeaders(request, headers);
  return new Response(object.body, { headers });
}

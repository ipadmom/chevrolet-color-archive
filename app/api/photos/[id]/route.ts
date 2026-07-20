import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { photoCandidates } from "../../../../db/schema";

export const runtime = "edge";

type ArchiveEnv = {
  UPLOADS?: R2Bucket;
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const bucket = (env as unknown as ArchiveEnv).UPLOADS;
  if (!bucket) return new Response("Storage unavailable", { status: 503 });

  const { id: rawId } = await context.params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id < 1) {
    return new Response("Not found", { status: 404 });
  }
  const rows = await getDb()
    .select()
    .from(photoCandidates)
    .where(eq(photoCandidates.id, id))
    .limit(1);
  const row = rows[0];
  if (!row) return new Response("Not found", { status: 404 });

  const object = await bucket.get(row.objectKey);
  if (!object) return new Response("Not found", { status: 404 });
  const headers = new Headers({
    "cache-control": "private, max-age=0, no-store",
    "content-disposition": `inline; filename="${row.fileName.replace(/"/g, "")}"`,
    etag: object.httpEtag,
    "x-content-type-options": "nosniff",
  });
  object.writeHttpMetadata(headers);
  return new Response(object.body, { headers });
}

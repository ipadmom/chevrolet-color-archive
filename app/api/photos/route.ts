import { env } from "cloudflare:workers";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { photoCandidates } from "../../../db/schema";

export const runtime = "edge";

const allowedTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);
const maxBytes = 15 * 1024 * 1024;

type ArchiveEnv = {
  UPLOADS?: R2Bucket;
};

function publicPhoto(row: typeof photoCandidates.$inferSelect) {
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
    imageUrl: `/api/photos/${row.id}`,
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const model = url.searchParams.get("model");
  const year = url.searchParams.get("year");
  const colorId = url.searchParams.get("color_id");
  if (!model || !year || !colorId) {
    return Response.json(
      { error: "model, year, and color_id are required" },
      { status: 400 },
    );
  }

  try {
    const rows = await getDb()
      .select()
      .from(photoCandidates)
      .where(
        and(
          eq(photoCandidates.model, model),
          eq(photoCandidates.year, year),
          eq(photoCandidates.colorId, colorId),
        ),
      )
      .orderBy(desc(photoCandidates.createdAt));
    return Response.json(rows.map(publicPhoto));
  } catch {
    return Response.json([], {
      headers: { "x-archive-storage": "unavailable" },
    });
  }
}

export async function POST(request: Request) {
  const bucket = (env as unknown as ArchiveEnv).UPLOADS;
  if (!bucket) {
    return Response.json({ error: "Upload storage is unavailable." }, { status: 503 });
  }

  const form = await request.formData();
  const photo = form.get("photo");
  const model = String(form.get("model") ?? "").trim();
  const year = String(form.get("year") ?? "").trim();
  const colorId = String(form.get("colorId") ?? "").trim();
  const colorName = String(form.get("colorName") ?? "").trim();
  const credit = String(form.get("credit") ?? "").trim();
  const license = String(form.get("license") ?? "").trim();

  if (!(photo instanceof File)) {
    return Response.json({ error: "Choose an image file." }, { status: 400 });
  }
  if (!model || !/^\d{4}$/.test(year) || !colorId || !colorName || !credit || !license) {
    return Response.json({ error: "Model, year, color, credit, and rights are required." }, { status: 400 });
  }
  if (!allowedTypes.has(photo.type)) {
    return Response.json({ error: "Upload a JPEG, PNG, GIF, or WebP image." }, { status: 415 });
  }
  if (photo.size < 1 || photo.size > maxBytes) {
    return Response.json({ error: "The image must be between 1 byte and 15 MB." }, { status: 413 });
  }

  const bytes = await photo.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const sha256 = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  const safeName =
    photo.name
      .normalize("NFKD")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 120) || "photo";

  const db = getDb();
  const duplicate = await db
    .select()
    .from(photoCandidates)
    .where(eq(photoCandidates.sha256, sha256))
    .limit(1);
  if (duplicate[0]) return Response.json(publicPhoto(duplicate[0]));

  const objectKey = [
    "staged",
    model,
    year,
    colorId,
    `${Date.now()}-${crypto.randomUUID()}-${safeName}`,
  ].join("/");

  await bucket.put(objectKey, bytes, {
    httpMetadata: {
      contentType: photo.type,
      cacheControl: "private, max-age=0, no-store",
    },
    customMetadata: {
      model,
      year,
      colorId,
      colorName,
      credit,
      license,
      sha256,
    },
  });

  try {
    const inserted = await db
      .insert(photoCandidates)
      .values({
        model,
        year,
        colorId,
        colorName,
        objectKey,
        fileName: safeName,
        contentType: photo.type,
        sizeBytes: photo.size,
        credit,
        license,
        sha256,
      })
      .returning();
    return Response.json(publicPhoto(inserted[0]), { status: 201 });
  } catch {
    await bucket.delete(objectKey);
    return Response.json(
      { error: "The upload could not be indexed. No file was retained." },
      { status: 500 },
    );
  }
}

import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "../../../db";
import { photoCandidates, photoReviewSelections } from "../../../db/schema";

export const runtime = "edge";

type SelectionRequest = {
  model?: unknown;
  year?: unknown;
  colorId?: unknown;
  candidateIds?: unknown;
};

export async function GET(request: Request) {
  const status = new URL(request.url).searchParams.get("status") ?? "queued";
  const rows = await getDb()
    .select()
    .from(photoReviewSelections)
    .where(eq(photoReviewSelections.status, status))
    .orderBy(desc(photoReviewSelections.createdAt));
  return Response.json(
    rows.map((row) => ({
      ...row,
      candidateIds: JSON.parse(row.candidateIdsJson) as number[],
      candidateIdsJson: undefined,
    })),
  );
}

export async function POST(request: Request) {
  let payload: SelectionRequest;
  try {
    payload = (await request.json()) as SelectionRequest;
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const model = typeof payload.model === "string" ? payload.model.trim() : "";
  const year = typeof payload.year === "string" ? payload.year.trim() : "";
  const colorId = typeof payload.colorId === "string" ? payload.colorId.trim() : "";
  const candidateIds = Array.isArray(payload.candidateIds)
    ? [...new Set(payload.candidateIds.map(Number).filter(Number.isInteger))]
    : [];

  if (!model || !/^\d{4}$/.test(year) || !colorId || !candidateIds.length) {
    return Response.json(
      { error: "model, year, colorId, and at least one candidate ID are required." },
      { status: 400 },
    );
  }
  if (candidateIds.length > 20) {
    return Response.json({ error: "Choose no more than 20 candidates." }, { status: 400 });
  }

  const db = getDb();
  const matching = await db
    .select({ id: photoCandidates.id })
    .from(photoCandidates)
    .where(
      and(
        inArray(photoCandidates.id, candidateIds),
        eq(photoCandidates.model, model),
        eq(photoCandidates.year, year),
        eq(photoCandidates.colorId, colorId),
      ),
    );
  if (matching.length !== candidateIds.length) {
    return Response.json(
      { error: "One or more candidates do not belong to this color record." },
      { status: 409 },
    );
  }

  const inserted = await db
    .insert(photoReviewSelections)
    .values({
      model,
      year,
      colorId,
      candidateIdsJson: JSON.stringify(candidateIds),
    })
    .returning();
  return Response.json(
    { ...inserted[0], candidateIds, candidateIdsJson: undefined },
    { status: 201 },
  );
}

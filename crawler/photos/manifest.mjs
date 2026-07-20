import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export const FACTORY_PAINT_DISCLAIMER =
  "Photo candidates are illustrative references only. A photograph does not prove that a color was factory-available, original to the vehicle, or accurately reproduced.";

function slug(value) {
  return String(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) =>
    a.localeCompare(b),
  );
}

function compareCandidates(left, right) {
  return (
    String(left.title).localeCompare(String(right.title)) ||
    String(left.id).localeCompare(String(right.id))
  );
}

export function recordIdFor(context) {
  return [
    context.make || "Chevrolet",
    context.model,
    context.year,
    context.color,
  ]
    .map(slug)
    .join("|");
}

export function emptyManifest(now = new Date().toISOString()) {
  return {
    schemaVersion: 1,
    generatedAt: now,
    purpose: "Human review of rights-aware vehicle photo candidates",
    factoryPaintEvidence: false,
    disclaimer: FACTORY_PAINT_DISCLAIMER,
    provider: {
      name: "Wikimedia Commons",
      api: "https://commons.wikimedia.org/w/api.php",
    },
    records: [],
  };
}

export async function readManifest(filePath) {
  try {
    const parsed = JSON.parse(await readFile(filePath, "utf8"));
    if (parsed.schemaVersion !== 1 || !Array.isArray(parsed.records)) {
      throw new Error(`Unsupported photo review manifest: ${filePath}`);
    }
    return parsed;
  } catch (error) {
    if (error.code === "ENOENT") {
      return emptyManifest();
    }
    throw error;
  }
}

function mergeCandidate(existing, incoming) {
  if (!existing) {
    return {
      ...incoming,
      searchQueries: uniqueSorted(incoming.searchQueries ?? []),
      rawSourceRefs: uniqueSorted(incoming.rawSourceRefs ?? []),
    };
  }

  return {
    ...existing,
    ...incoming,
    id: existing.id,
    dedupeKey: existing.dedupeKey,
    searchQueries: uniqueSorted([
      ...(existing.searchQueries ?? []),
      ...(incoming.searchQueries ?? []),
    ]),
    rawSourceRefs: uniqueSorted([
      ...(existing.rawSourceRefs ?? []),
      ...(incoming.rawSourceRefs ?? []),
    ]),
  };
}

export function mergeDiscovery({
  manifest,
  context,
  candidates,
  rawResponseFiles = [],
  now = new Date().toISOString(),
}) {
  const id = recordIdFor(context);
  let record = manifest.records.find((entry) => entry.recordId === id);
  if (!record) {
    record = {
      recordId: id,
      context,
      searchQueries: [],
      rawResponseFiles: [],
      review: {
        selectedCandidateIds: [],
        byCandidate: {},
      },
      candidates: [],
    };
    manifest.records.push(record);
  }

  const byKey = new Map(
    record.candidates.map((candidate) => [candidate.dedupeKey, candidate]),
  );
  for (const candidate of candidates) {
    byKey.set(
      candidate.dedupeKey,
      mergeCandidate(byKey.get(candidate.dedupeKey), candidate),
    );
  }

  record.candidates = [...byKey.values()].sort(compareCandidates);
  record.searchQueries = uniqueSorted(
    record.candidates.flatMap((candidate) => candidate.searchQueries ?? []),
  );
  record.rawResponseFiles = uniqueSorted([
    ...(record.rawResponseFiles ?? []),
    ...rawResponseFiles,
  ]);
  record.updatedAt = now;
  manifest.records.sort((left, right) =>
    left.recordId.localeCompare(right.recordId),
  );
  manifest.generatedAt = now;
  return record;
}

export function markCandidateReview({
  manifest,
  recordId,
  candidateIds,
  status,
  note = null,
  now = new Date().toISOString(),
}) {
  const record = manifest.records.find((entry) => entry.recordId === recordId);
  if (!record) {
    throw new Error(`Record not found: ${recordId}`);
  }

  const validIds = new Set(record.candidates.map((candidate) => candidate.id));
  for (const candidateId of candidateIds) {
    if (!validIds.has(candidateId)) {
      throw new Error(`Candidate not found in ${recordId}: ${candidateId}`);
    }
    record.review.byCandidate[candidateId] = {
      status,
      note,
      reviewedAt: now,
    };
  }

  const selected = new Set(record.review.selectedCandidateIds ?? []);
  for (const candidateId of candidateIds) {
    if (status === "selected") {
      selected.add(candidateId);
    } else {
      selected.delete(candidateId);
    }
  }
  record.review.selectedCandidateIds = [...selected].sort();
  record.updatedAt = now;
  manifest.generatedAt = now;
}

export async function writeJsonAtomic(filePath, value) {
  const absolute = path.resolve(filePath);
  await mkdir(path.dirname(absolute), { recursive: true });
  const temporary = `${absolute}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporary, absolute);
}


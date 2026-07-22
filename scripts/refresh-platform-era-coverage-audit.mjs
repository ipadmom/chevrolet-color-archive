import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const catalogPath = new URL("data/catalog/chevrolet-us-nameplates.json", root);
const platformPath = new URL("data/catalog/chevrolet-platform-eras.json", root);
const outputPath = new URL(
  "data/audits/chevrolet-platform-era-coverage.json",
  root,
);

function expandRanges(ranges) {
  return ranges.flatMap(({ start, end }) =>
    Array.from({ length: end - start + 1 }, (_, index) => start + index),
  );
}

function compressYears(years) {
  const sorted = [...new Set(years)].sort((left, right) => left - right);
  const ranges = [];
  for (const year of sorted) {
    const current = ranges.at(-1);
    if (!current || year !== current.end + 1) {
      ranges.push({ start: year, end: year });
    } else {
      current.end = year;
    }
  }
  return ranges;
}

const [catalog, platformEras] = await Promise.all([
  readFile(catalogPath, "utf8").then(JSON.parse),
  readFile(platformPath, "utf8").then(JSON.parse),
]);

const catalogById = new Map(catalog.models.map((model) => [model.id, model]));
const validation = {
  invalid_model_id_count: 0,
  invalid_band_count: 0,
  overlap_count: 0,
  out_of_catalog_year_count: 0,
};
const validationErrors = [];

for (const [modelId, bands] of Object.entries(platformEras)) {
  const model = catalogById.get(modelId);
  if (!model) {
    validation.invalid_model_id_count += 1;
    validationErrors.push(`${modelId}: model ID is absent from the catalog`);
    continue;
  }
  if (!Array.isArray(bands) || bands.length === 0) {
    validation.invalid_band_count += 1;
    validationErrors.push(`${modelId}: platform-band array is empty or invalid`);
    continue;
  }

  const catalogYears = new Set(expandRanges(model.model_year_ranges));
  let previousEnd = -Infinity;
  for (const band of bands) {
    const validBand =
      Number.isInteger(band.start) &&
      Number.isInteger(band.end) &&
      band.start <= band.end &&
      typeof band.label === "string" &&
      band.label.trim().length > 0 &&
      Array.isArray(band.aliases) &&
      band.aliases.length > 0 &&
      Array.isArray(band.evidence_urls) &&
      band.evidence_urls.length > 0 &&
      band.evidence_urls.every((url) => /^https:\/\//.test(url)) &&
      /^(high|medium|low)$/.test(band.confidence ?? "") &&
      typeof band.notes === "string" &&
      band.notes.trim().length > 0;
    if (!validBand) {
      validation.invalid_band_count += 1;
      validationErrors.push(
        `${modelId}: invalid band record ${JSON.stringify(band)}`,
      );
      continue;
    }
    if (band.start <= previousEnd) {
      validation.overlap_count += 1;
      validationErrors.push(
        `${modelId}: ${band.start}-${band.end} overlaps or is out of order`,
      );
    }
    previousEnd = Math.max(previousEnd, band.end);

    for (let year = band.start; year <= band.end; year += 1) {
      if (!catalogYears.has(year)) {
        validation.out_of_catalog_year_count += 1;
        validationErrors.push(
          `${modelId}: ${band.start}-${band.end} includes non-catalog year ${year}`,
        );
      }
    }
  }
}

if (validationErrors.length > 0) {
  throw new Error(
    `Platform-era validation failed:\n${validationErrors.join("\n")}`,
  );
}

const records = catalog.models.map((model) => {
  const catalogYears = new Set(expandRanges(model.model_year_ranges));
  const bands = platformEras[model.id] ?? [];
  const platformYears = new Set(expandRanges(bands));
  const uncoveredYears = [...catalogYears].filter(
    (year) => !platformYears.has(year),
  );
  const status =
    uncoveredYears.length === 0
      ? "complete"
      : bands.length > 0
        ? "partial"
        : "missing";

  return {
    model_id: model.id,
    model_name: model.name,
    vehicle_class: model.vehicle_class,
    catalog_year_ranges: model.model_year_ranges.map(({ start, end }) => ({
      start,
      end,
    })),
    catalog_year_count: catalogYears.size,
    platform_band_count: bands.length,
    platform_year_count: platformYears.size,
    uncovered_year_count: uncoveredYears.length,
    uncovered_year_ranges: compressYears(uncoveredYears),
    coverage_status: status,
  };
});

const count = (status) =>
  records.filter((record) => record.coverage_status === status).length;
const sum = (field) =>
  records.reduce((total, record) => total + record[field], 0);

const audit = {
  schema_version: 1,
  generated_on: new Date().toISOString().slice(0, 10),
  scope:
    "Every model and model year in data/catalog/chevrolet-us-nameplates.json, reconciled against sourced, nonoverlapping bands in data/catalog/chevrolet-platform-eras.json.",
  status_definitions: {
    complete: "Every catalog model year has a sourced platform or era band.",
    partial:
      "At least one sourced band exists, but one or more catalog model years remain unlabeled because evidence is incomplete or contradictory.",
    missing:
      "No platform or era band has yet been added; the catalog range remains visible without an invented label.",
  },
  summary: {
    catalog_model_count: records.length,
    platform_model_count: Object.keys(platformEras).length,
    complete_model_count: count("complete"),
    partial_model_count: count("partial"),
    missing_model_count: count("missing"),
    platform_band_count: Object.values(platformEras).flat().length,
    catalog_model_year_count: sum("catalog_year_count"),
    covered_model_year_count: sum("platform_year_count"),
    uncovered_model_year_count: sum("uncovered_year_count"),
  },
  validation,
  records,
};

await writeFile(outputPath, `${JSON.stringify(audit, null, 2)}\n`, "utf8");
console.log(fileURLToPath(outputPath));

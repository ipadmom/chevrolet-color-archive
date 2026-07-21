import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(
  root,
  "data",
  "sources",
  "gm-heritage-chevrolet-kits.json",
);
const outputPath = path.join(
  root,
  "crawler",
  "manifests",
  "gm-heritage-chevrolet-all.jsonl",
);

const source = JSON.parse(await readFile(sourcePath, "utf8"));
if (!Array.isArray(source.entries)) {
  throw new Error("Official GM source inventory has no entries array.");
}

function slug(value) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function modelName(label) {
  if (label === "Chevrolet") return "Full line";
  return label.replace(/^Chevrolet\s+/i, "").trim();
}

const records = source.entries.map((entry) => {
  const years = Array.isArray(entry.years) ? entry.years : [entry.year];
  return {
    source_id: `gm-heritage-${slug(entry.title)}`,
    canonical_url: entry.pdf_url,
    title: `${entry.title} Vehicle Information Kit`,
    publisher: "General Motors",
    source_type: "vehicle_information_kit",
    make: "Chevrolet",
    model: modelName(entry.model_label),
    year_start: Math.min(...years),
    year_end: Math.max(...years),
    officiality: "official",
    expected_media_type: "application/pdf",
    discovered_from: entry.source_index_url,
  };
});

const ids = new Set(records.map((record) => record.source_id));
if (ids.size !== records.length) {
  throw new Error(
    `Crawler source IDs are not unique: ${ids.size} IDs for ${records.length} records.`,
  );
}

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(
  outputPath,
  `${records.map((record) => JSON.stringify(record)).join("\n")}\n`,
  "utf8",
);

console.log(
  `Wrote ${records.length} official GM source records to ${path.relative(root, outputPath)}.`,
);

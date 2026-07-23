#!/usr/bin/env node

import { createHash } from "node:crypto";
import {
  copyFile,
  mkdir,
  readFile,
  rename,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RELEASE_TAG = "current-order-guide-source-archive-v1";
const RELEASE_BASE =
  `https://github.com/ipadmom/chevrolet-color-archive/releases/download/${RELEASE_TAG}/`;
const SOURCE_ROOT = path.join(ROOT, "tmp", "specialty-color-research");
const SOURCE_REPORTS = [
  path.join(SOURCE_ROOT, "official-order-guide-pages.json"),
  path.join(SOURCE_ROOT, "current-completion", "order-guide-pages.json"),
];
const STAGING = path.join(ROOT, "tmp", "release-staging", RELEASE_TAG);
const TRACKED_MANIFEST = path.join(
  ROOT,
  "data",
  "sources",
  "current-order-guide-source-release-manifest.json",
);
const STAGED_MANIFEST_NAME = "current-order-guide-source-release-manifest.json";
const CHECKSUM_NAME = "source-sha256-manifest.txt";
const EXPECTED_ENTRY_COUNT = 31;

function parseArgs(argv) {
  const options = { apply: false };
  for (const argument of argv) {
    if (argument === "--apply") {
      options.apply = true;
      continue;
    }
    if (argument === "--help" || argument === "-h") {
      console.log(`Usage: node scripts/stage-current-order-guide-release.mjs [--apply]

Validates and stages the retained 2025 and 2026 GM Online Order Guide PDFs.
The default mode writes only ignored staging files. --apply also writes the
tracked source manifest. This script never creates or uploads a GitHub Release.
`);
      process.exit(0);
    }
    throw new Error(`Unknown argument: ${argument}`);
  }
  return options;
}

function assertInside(parent, child, label) {
  const relative = path.relative(parent, child);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`${label} escapes its required root: ${child}`);
  }
}

async function sha256(file) {
  const bytes = await readFile(file);
  return createHash("sha256").update(bytes).digest("hex");
}

function sourceId(record) {
  return `gm-online-order-guide-pdf-${record.vehicle_id}`;
}

export function archiveEntry(record, priorEntry = null) {
  const assetName = path.basename(record.local_file);
  const canPreserveReview =
    priorEntry?.source_id === sourceId(record) &&
    priorEntry?.sha256 === record.sha256;
  const priorPages = new Map(
    canPreserveReview
      ? (priorEntry.cited_pages ?? []).map((page) => [
          `${page.pdf_page}\u001f${page.text_sha256}`,
          page,
        ])
      : [],
  );
  const citedPages = (record.cited_pages ?? []).map((page) => {
    const normalizedPage = {
      pdf_page: page.pdf_page,
      printed_page: page.printed_page,
      published_date: page.published_date,
      text_sha256: page.text_sha256,
    };
    const priorPage = priorPages.get(
      `${page.pdf_page}\u001f${page.text_sha256}`,
    );
    if (
      typeof priorPage?.visual_review_status === "string" &&
      typeof priorPage?.visual_review_finding === "string"
    ) {
      normalizedPage.visual_review_status = priorPage.visual_review_status;
      if (typeof priorPage.visual_reviewed_at === "string") {
        normalizedPage.visual_reviewed_at = priorPage.visual_reviewed_at;
      }
      normalizedPage.visual_review_finding = priorPage.visual_review_finding;
    }
    return normalizedPage;
  });
  const completeReviewPreserved =
    citedPages.length > 0 &&
    citedPages.every(
      (page) =>
        typeof page.visual_review_status === "string" &&
        typeof page.visual_review_finding === "string",
    );
  return {
    source_id: sourceId(record),
    vehicle_id: record.vehicle_id,
    model_year: record.model_year,
    vehicle_name: record.vehicle_name,
    original_source_url: record.source_url,
    retrieved_at: record.retrieved_at,
    asset_name: assetName,
    archive_url: `${RELEASE_BASE}${encodeURIComponent(assetName)}`,
    sha256: record.sha256,
    bytes: record.bytes,
    pdf_page_count: record.pdf_page_count,
    cited_pages: citedPages,
    artifact_status: "retained_exact_snapshot",
    review_status:
      completeReviewPreserved &&
      priorEntry?.review_status === "cited_pages_visually_reviewed"
        ? "cited_pages_visually_reviewed"
        : citedPages.length > 0
        ? "page_located_pending_visual_review"
        : "retained_pending_page_review",
  };
}

async function writeAtomic(file, text) {
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.tmp-${process.pid}`;
  await writeFile(temporary, text, "utf8");
  await rename(temporary, file);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  let priorEntries = new Map();
  try {
    const priorManifest = JSON.parse(await readFile(TRACKED_MANIFEST, "utf8"));
    priorEntries = new Map(
      (priorManifest.entries ?? []).map((entry) => [entry.source_id, entry]),
    );
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
  }
  const recordSets = await Promise.all(
    SOURCE_REPORTS.map(async (sourceReport) =>
      JSON.parse(await readFile(sourceReport, "utf8")),
    ),
  );
  const records = recordSets
    .flat()
    .filter(
      (record) => record.model_year === 2025 || record.model_year === 2026,
    );
  if (records.length !== EXPECTED_ENTRY_COUNT) {
    throw new Error(
      `expected ${EXPECTED_ENTRY_COUNT} retained 2025/2026 snapshots, found ${records.length}`,
    );
  }

  const vehicleIds = new Set();
  const assetNames = new Set();
  await mkdir(STAGING, { recursive: true });
  const entries = [];
  for (const record of records) {
    if (!Number.isInteger(record.vehicle_id) || vehicleIds.has(record.vehicle_id)) {
      throw new Error(`duplicate or invalid vehicle ID: ${record.vehicle_id}`);
    }
    vehicleIds.add(record.vehicle_id);
    if (!/^https:\/\/eog-api\.musea2\.azure\.ext\.gm\.com\//.test(record.source_url)) {
      throw new Error(`unexpected source URL for ${record.vehicle_id}`);
    }
    if (!/^[a-f0-9]{64}$/.test(record.sha256)) {
      throw new Error(`invalid SHA-256 for ${record.vehicle_id}`);
    }
    if (!Number.isInteger(record.pdf_page_count) || record.pdf_page_count < 1) {
      throw new Error(`invalid PDF page count for ${record.vehicle_id}`);
    }
    const source = path.resolve(SOURCE_ROOT, record.local_file);
    assertInside(SOURCE_ROOT, source, "source PDF");
    const sourceStat = await stat(source);
    if (sourceStat.size !== record.bytes) {
      throw new Error(
        `byte-count mismatch for ${record.vehicle_id}: expected ${record.bytes}, found ${sourceStat.size}`,
      );
    }
    const actualHash = await sha256(source);
    if (actualHash !== record.sha256) {
      throw new Error(
        `SHA-256 mismatch for ${record.vehicle_id}: expected ${record.sha256}, found ${actualHash}`,
      );
    }
    const entry = archiveEntry(record, priorEntries.get(sourceId(record)));
    if (assetNames.has(entry.asset_name)) {
      throw new Error(`duplicate asset name: ${entry.asset_name}`);
    }
    assetNames.add(entry.asset_name);
    const destination = path.join(STAGING, entry.asset_name);
    assertInside(STAGING, destination, "staged PDF");
    await copyFile(source, destination);
    entries.push(entry);
  }

  entries.sort((left, right) => left.asset_name.localeCompare(right.asset_name));
  const checksumText = entries
    .map((entry) => `${entry.sha256}  ${entry.asset_name}\n`)
    .join("");
  const checksumPath = path.join(STAGING, CHECKSUM_NAME);
  await writeAtomic(checksumPath, checksumText);
  const checksumEntry = {
    asset_name: CHECKSUM_NAME,
    archive_url: `${RELEASE_BASE}${CHECKSUM_NAME}`,
    sha256: await sha256(checksumPath),
    bytes: (await stat(checksumPath)).size,
    role: "flat_filename_sha256_manifest",
  };

  const manifest = {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    repository: "ipadmom/chevrolet-color-archive",
    release_tag: RELEASE_TAG,
    release_url: `https://github.com/ipadmom/chevrolet-color-archive/releases/tag/${RELEASE_TAG}`,
    scope:
      "Complete retained GM Online Order Guide PDF snapshots for the current-model 2025 and 2026 specialty, Woodland Green, and exact palette-completion review queues. Retention does not itself promote a color or complete a model-year chart.",
    release_upload_performed: false,
    entry_count: entries.length,
    total_pdf_bytes: entries.reduce((sum, entry) => sum + entry.bytes, 0),
    total_pdf_pages: entries.reduce(
      (sum, entry) => sum + entry.pdf_page_count,
      0,
    ),
    checksum_asset: checksumEntry,
    entries,
  };
  const serialized = `${JSON.stringify(manifest, null, 2)}\n`;
  const stagedManifestPath = path.join(STAGING, STAGED_MANIFEST_NAME);
  await writeAtomic(stagedManifestPath, serialized);
  if (options.apply) {
    await writeAtomic(TRACKED_MANIFEST, serialized);
  }

  console.log(
    JSON.stringify(
      {
        mode: options.apply ? "apply" : "stage-only",
        entry_count: manifest.entry_count,
        total_pdf_bytes: manifest.total_pdf_bytes,
        total_pdf_pages: manifest.total_pdf_pages,
        checksum_sha256: checksumEntry.sha256,
        staging_directory: path.relative(ROOT, STAGING).replaceAll(path.sep, "/"),
        staged_manifest: path
          .relative(ROOT, stagedManifestPath)
          .replaceAll(path.sep, "/"),
        tracked_manifest_written: options.apply,
      },
      null,
      2,
    ),
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack : String(error));
    process.exitCode = 1;
  });
}

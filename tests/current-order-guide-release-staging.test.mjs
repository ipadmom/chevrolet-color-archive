import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import test from "node:test";
import { archiveEntry } from "../scripts/stage-current-order-guide-release.mjs";

const execFileAsync = promisify(execFile);
const root = path.resolve(fileURLToPath(new URL("../", import.meta.url)));
const script = path.join(
  root,
  "scripts",
  "stage-current-order-guide-release.mjs",
);
const trackedManifest = path.join(
  root,
  "data",
  "sources",
  "current-order-guide-source-release-manifest.json",
);

test("current Order Guide staging operator is pinned and upload-free", async () => {
  const scriptSource = await readFile(script, "utf8");
  assert.match(
    scriptSource,
    /current-order-guide-source-archive-v1/,
  );
  assert.match(
    scriptSource,
    /ipadmom\/chevrolet-color-archive/,
  );
  assert.match(scriptSource, /EXPECTED_ENTRY_COUNT = 31/);
  assert.match(scriptSource, /current-completion", "order-guide-pages\.json"/);
  assert.doesNotMatch(scriptSource, /\bgh\s+release\b|\bfetch\s*\(/);
});

test("published current Order Guide source manifest is complete and immutable", async () => {
  const manifestText = await readFile(trackedManifest, "utf8");
  const manifest = JSON.parse(manifestText);
  assert.equal(manifest.schema_version, 1);
  assert.equal(manifest.repository, "ipadmom/chevrolet-color-archive");
  assert.equal(manifest.release_tag, "current-order-guide-source-archive-v1");
  assert.equal(manifest.release_upload_performed, true);
  assert.match(manifest.uploaded_at, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(manifest.remote_asset_count, 33);
  assert.equal(
    manifest.remote_total_bytes,
    manifest.total_pdf_bytes +
      manifest.checksum_asset.bytes +
      Buffer.byteLength(manifestText),
  );
  assert.equal(manifest.entry_count, 31);
  assert.equal(manifest.total_pdf_bytes, 14302332);
  assert.equal(manifest.total_pdf_pages, 3457);
  assert.equal(manifest.entries.length, 31);
  assert.equal(new Set(manifest.entries.map((entry) => entry.vehicle_id)).size, 31);
  assert.equal(
    manifest.entries.reduce((sum, entry) => sum + entry.bytes, 0),
    manifest.total_pdf_bytes,
  );
  assert.equal(
    manifest.entries.reduce((sum, entry) => sum + entry.pdf_page_count, 0),
    manifest.total_pdf_pages,
  );
  const completionPages = new Map([
    [22745, 21],
    [22775, 20],
    [22821, 13],
    [22878, 35],
    [23208, 174],
  ]);
  for (const [vehicleId, pdfPage] of completionPages) {
    const entry = manifest.entries.find(
      (candidate) => candidate.vehicle_id === vehicleId,
    );
    assert.ok(entry, `missing completion snapshot ${vehicleId}`);
    assert.equal(entry.review_status, "cited_pages_visually_reviewed");
    assert.equal(entry.cited_pages.length, 1);
    assert.equal(entry.cited_pages[0].pdf_page, pdfPage);
    assert.equal(
      entry.cited_pages[0].visual_review_status,
      "visually_verified_exact_snapshot",
    );
    assert.ok(entry.cited_pages[0].visual_review_finding.length > 30);
  }
  assert.match(manifest.checksum_asset.sha256, /^[a-f0-9]{64}$/);
  assert.equal(manifest.checksum_asset.bytes, 3283);
  for (const entry of manifest.entries) {
    assert.match(entry.sha256, /^[a-f0-9]{64}$/);
    assert.ok(entry.bytes > 0);
    assert.ok(entry.pdf_page_count > 0);
    assert.equal(entry.artifact_status, "retained_exact_snapshot");
    assert.match(
      entry.original_source_url,
      /^https:\/\/eog-api\.musea2\.azure\.ext\.gm\.com\//,
    );
    assert.match(
      entry.archive_url,
      /^https:\/\/github\.com\/ipadmom\/chevrolet-color-archive\/releases\/download\/current-order-guide-source-archive-v1\//,
    );
  }
});

test("current Order Guide staging help is side-effect free and explicit", async () => {
  const { stdout, stderr } = await execFileAsync(
    process.execPath,
    [script, "--help"],
    { cwd: root },
  );
  assert.equal(stderr, "");
  assert.match(stdout, /never creates or uploads a GitHub Release/i);
  assert.match(stdout, /--apply/);
});

test("content-addressed visual review survives safe manifest regeneration", async () => {
  const manifest = JSON.parse(await readFile(trackedManifest, "utf8"));
  for (const vehicleId of [22745, 22775, 22821, 22878, 22917, 23168, 23208]) {
    const priorEntry = manifest.entries.find(
      (entry) => entry.vehicle_id === vehicleId,
    );
    assert.ok(priorEntry);
    assert.equal(priorEntry.review_status, "cited_pages_visually_reviewed");

    const record = {
      vehicle_id: priorEntry.vehicle_id,
      model_year: priorEntry.model_year,
      vehicle_name: priorEntry.vehicle_name,
      source_url: priorEntry.original_source_url,
      retrieved_at: priorEntry.retrieved_at,
      local_file: priorEntry.asset_name,
      sha256: priorEntry.sha256,
      bytes: priorEntry.bytes,
      pdf_page_count: priorEntry.pdf_page_count,
      cited_pages: priorEntry.cited_pages.map(
        ({
          pdf_page,
          printed_page,
          published_date,
          text_sha256,
        }) => ({
          pdf_page,
          printed_page,
          published_date,
          text_sha256,
        }),
      ),
    };
    const regenerated = archiveEntry(record, priorEntry);
    assert.equal(regenerated.review_status, "cited_pages_visually_reviewed");
    assert.deepEqual(
      regenerated.cited_pages.map(
        ({
          visual_review_status,
          visual_reviewed_at,
          visual_review_finding,
        }) => ({
          visual_review_status,
          visual_reviewed_at,
          visual_review_finding,
        }),
      ),
      priorEntry.cited_pages.map(
        ({
          visual_review_status,
          visual_reviewed_at,
          visual_review_finding,
        }) => ({
          visual_review_status,
          visual_reviewed_at,
          visual_review_finding,
        }),
      ),
    );

    const changedPdf = archiveEntry(
      { ...record, sha256: "0".repeat(64) },
      priorEntry,
    );
    assert.equal(changedPdf.review_status, "page_located_pending_visual_review");
    assert.ok(
      changedPdf.cited_pages.every(
        (page) => page.visual_review_status === undefined,
      ),
    );

    const changedPage = archiveEntry(
      {
        ...record,
        cited_pages: record.cited_pages.map((page, index) =>
          index === 0 ? { ...page, text_sha256: "f".repeat(64) } : page,
        ),
      },
      priorEntry,
    );
    assert.equal(changedPage.review_status, "page_located_pending_visual_review");
    assert.equal(changedPage.cited_pages[0].visual_review_status, undefined);
  }
});

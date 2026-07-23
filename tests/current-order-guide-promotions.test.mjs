import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function json(path) {
  return JSON.parse(await readFile(new URL(path, root), "utf8"));
}

test("retained Silverado Order Guide pages publish only exact Woodland Green rows", async () => {
  const [specialty, release, reconciliation] = await Promise.all([
    json("data/sources/specialty-color-source-candidates.json"),
    json("data/sources/current-order-guide-source-release-manifest.json"),
    json("data/audits/current-model-order-guide-reconciliation.json"),
  ]);
  const recordIds = [
    "gm-eog-2025-silverado-1500-woodland-green",
    "gm-eog-2026-silverado-1500-woodland-green",
  ];
  const published = specialty.app_publication_records.filter((record) =>
    recordIds.includes(record.record_id),
  );

  assert.equal(published.length, 2);
  assert.deepEqual(
    published.map((record) => record.model_year),
    [2025, 2026],
  );
  assert.equal(new Set(published.map((record) => record.program_id)).size, 1);
  assert.ok(
    published.every(
      (record) =>
        record.publication_status === "published_specialty_subset" &&
        record.application_type === "special_equipment_option_paint" &&
        record.availability_state === "available_with_minimum_batch" &&
        record.label === "Woodland Green" &&
        record.seo_code === "9V5" &&
        record.wa_code === "WA-9015" &&
        record.factory_paint_code === null &&
        record.touch_up_paint_number === "WA-9015" &&
        record.minimum_batch_units === 5 &&
        record.factory_installation_claim === null &&
        record.source_model_scope.length === 1 &&
        record.source_model_scope[0] === "Silverado 1500 Retail and Fleet" &&
        record.source.archive_url.startsWith(
          "https://github.com/ipadmom/chevrolet-color-archive/releases/download/current-order-guide-source-archive-v1/",
        ),
    ),
  );
  assert.equal(
    specialty.verified_not_published.filter((record) =>
      recordIds.includes(record.record_id),
    ).length,
    0,
  );

  const sourcePages = new Map([
    [22917, 221],
    [23168, 236],
  ]);
  for (const [vehicleId, pdfPage] of sourcePages) {
    const entry = release.entries.find(
      (candidate) => candidate.vehicle_id === vehicleId,
    );
    assert.equal(entry.review_status, "cited_pages_visually_reviewed");
    const page = entry.cited_pages.find(
      (candidate) => candidate.pdf_page === pdfPage,
    );
    assert.equal(page.visual_review_status, "visually_verified_exact_snapshot");
    assert.match(page.visual_review_finding, /Woodland Green/);
    assert.match(page.visual_review_finding, /9V5/);
    assert.match(page.visual_review_finding, /WA-9015/);
  }

  const silverado = reconciliation.records.find(
    (record) => record.model_id === "silverado",
  );
  assert.ok(
    silverado.years.every(
      (year) => year.published_retail_fleet_seo_identity_count === 1,
    ),
  );
  assert.ok(
    silverado.years.every(
      (year) => year.missing_retail_fleet_seo_identity_count === 20,
    ),
  );
  assert.equal(silverado.safe_to_upgrade_to_verified_complete, false);
  assert.match(reconciliation.identity_guards.join("\n"), /Forest Service Green/);
});

test("retained completion pages preserve exact current-model color identities", async () => {
  const [modern, release] = await Promise.all([
    json("data/sources/modern-chevrolet-color-source-candidates.json"),
    json("data/sources/current-order-guide-source-release-manifest.json"),
  ]);
  const expected = new Map([
    [22745, { page: 21, code: "16U", paint: "Arc White" }],
    [22775, { page: 20, code: "46U", paint: "Woodland Green" }],
    [22821, { page: 13, code: "16U", paint: "Arc White" }],
    [22878, { page: 35, code: "GAG", paint: "Habanero Orange" }],
    [23208, { page: 174, code: "GRF", paint: "Blade Silver Matte" }],
  ]);

  for (const [vehicleId, exact] of expected) {
    const sourceId = `gm-online-order-guide-pdf-${vehicleId}`;
    const source = modern.sources.find((entry) => entry.source_id === sourceId);
    const table = modern.verified_palette_tables.find(
      (entry) => entry.source_id === sourceId,
    );
    const retained = release.entries.find(
      (entry) => entry.vehicle_id === vehicleId,
    );
    const page = retained.cited_pages.find(
      (entry) => entry.pdf_page === exact.page,
    );

    assert.ok(source);
    assert.ok(table);
    assert.equal(source.sha256, retained.sha256);
    assert.equal(source.bytes, retained.bytes);
    assert.equal(source.page_count, retained.pdf_page_count);
    assert.equal(source.archive_url, retained.archive_url);
    assert.equal(table.archive_url, retained.archive_url);
    assert.equal(table.sha256, retained.sha256);
    assert.equal(table.bytes, retained.bytes);
    assert.equal(table.pdf_page_count, retained.pdf_page_count);
    assert.ok(table.colors.includes(exact.paint));
    assert.equal(table.factory_codes[exact.paint], exact.code);
    assert.equal(retained.review_status, "cited_pages_visually_reviewed");
    assert.equal(
      page.visual_review_status,
      "visually_verified_exact_snapshot",
    );
    assert.match(page.visual_review_finding, new RegExp(exact.paint));
    assert.match(page.visual_review_finding, new RegExp(exact.code));
  }

  const lcfWoodland = modern.verified_palette_tables
    .find((table) => table.source_id === "gm-online-order-guide-pdf-22775")
    .color_restrictions["Woodland Green"]
    .join(" ");
  assert.match(lcfWoodland, /Isuzu color code 46U/);
  assert.match(lcfWoodland, /no WA number/i);
  assert.doesNotMatch(lcfWoodland, /WA-9015/);
});

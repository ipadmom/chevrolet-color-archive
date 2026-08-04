import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  applyCurrentOrderGuideReconciliation,
  applyCurrentOrderGuideSpecialtyTranche,
} from "../scripts/update-current-order-guide-specialty-tranche.mjs";

const root = new URL("../", import.meta.url);

async function json(path) {
  return JSON.parse(await readFile(new URL(path, root), "utf8"));
}

test("the retained current Order Guide tranche publishes 30 exact rows", async () => {
  const specialty = await json(
    "data/sources/specialty-color-source-candidates.json",
  );
  const rows = specialty.app_publication_records.filter((record) =>
    record.record_id.startsWith("gm-eog-current-"),
  );

  assert.equal(rows.length, 30);
  assert.equal(new Set(rows.map((record) => record.record_id)).size, 30);
  assert.equal(new Set(rows.map((record) => record.source.source_id)).size, 20);
  assert.ok(
    rows.every(
      (record) =>
        record.publication_status === "published_specialty_subset" &&
        record.application_type === "special_equipment_option_paint" &&
        record.finish === "solid" &&
        record.factory_paint_code === null &&
        record.factory_installation_claim === null &&
        record.source.archive_url.startsWith(
          "https://github.com/ipadmom/chevrolet-color-archive/releases/download/current-order-guide-source-archive-v1/",
        ),
    ),
  );
  assert.ok(
    rows.every(
      (record) =>
        !/forest service green|forestry green/i.test(record.label) &&
        record.wa_code !== "46U" &&
        record.seo_code !== "46U",
    ),
  );

  const counts = Object.fromEntries(
    ["tahoe", "suburban", "express", "silverado-hd"].flatMap((modelId) =>
      [2025, 2026].map((year) => [
        `${modelId}:${year}`,
        rows.filter(
          (record) =>
            record.catalog_model_ids.includes(modelId) &&
            record.model_year === year,
        ).length,
      ]),
    ),
  );
  assert.deepEqual(counts, {
    "tahoe:2025": 7,
    "tahoe:2026": 7,
    "suburban:2025": 1,
    "suburban:2026": 1,
    "express:2025": 3,
    "express:2026": 3,
    "silverado-hd:2025": 4,
    "silverado-hd:2026": 4,
  });
});

test("Tahoe police and special-service rows preserve the combined six-color scope", async () => {
  const specialty = await json(
    "data/sources/specialty-color-source-candidates.json",
  );
  const rows = specialty.app_publication_records.filter(
    (record) =>
      record.record_id.startsWith("gm-eog-current-") &&
      record.program_id ===
        "gm-tahoe-police-special-service-seo-solid-paint-2025-2026",
  );
  const expected = [
    ["Victory Red", "5T4", "WA-9260"],
    ["MSP Blue", "9V2", "WA-5665"],
    ["Woodland Green", "9V5", "WA-9015"],
    ["Dark Blue Metallic", "9V7", "WA-722J"],
    ["Wheatland Yellow", "9W3", "WA-253A"],
    ["Silver Ice Metallic", "9W5", "WA-636R"],
  ];

  assert.equal(rows.length, 12);
  for (const year of [2025, 2026]) {
    const yearRows = rows.filter((record) => record.model_year === year);
    assert.deepEqual(
      yearRows.map((record) => [
        record.label,
        record.seo_code,
        record.wa_code,
      ]),
      expected,
    );
    assert.ok(
      yearRows.every(
        (record) =>
          record.minimum_batch_units === 5 &&
          record.availability_state === "available_with_minimum_batch" &&
          record.restrictions.join(" ").includes(
            "does not establish separate PPV-only or SSV-only applicability",
          ),
      ),
    );
  }
});

test("configuration-specific Woodland Green rows retain printed restrictions", async () => {
  const specialty = await json(
    "data/sources/specialty-color-source-candidates.json",
  );
  const rows = specialty.app_publication_records.filter(
    (record) =>
      record.record_id.startsWith("gm-eog-current-") &&
      record.label === "Woodland Green",
  );
  assert.equal(rows.length, 20);
  assert.ok(
    rows.every(
      (record) =>
        record.seo_code === "9V5" &&
        record.wa_code === "WA-9015" &&
        record.touch_up_paint_number === "WA-9015",
    ),
  );

  const express = rows.filter((record) =>
    record.catalog_model_ids.includes("express"),
  );
  assert.equal(express.length, 6);
  assert.ok(
    express.every(
      (record) =>
        record.source_label_raw === "Green, Woodland" &&
        record.minimum_batch_units === 5 &&
        record.restrictions.join(" ").includes("flat Black"),
    ),
  );

  const lightHd = rows.filter(
    (record) =>
      record.catalog_model_ids.includes("silverado-hd") &&
      !record.source_model_scope[0].includes("4500 HD"),
  );
  assert.equal(lightHd.length, 6);
  assert.ok(
    lightHd.every(
      (record) =>
        record.minimum_batch_units === 5 &&
        record.restrictions.join(" ").includes("extended lead time") &&
        record.restrictions.join(" ").includes("5IS / WA-636R"),
    ),
  );

  const mediumDuty = rows.filter((record) =>
    record.source_model_scope[0].includes("4500 HD"),
  );
  assert.equal(mediumDuty.length, 2);
  assert.ok(
    mediumDuty.every(
      (record) =>
        record.minimum_batch_units === null &&
        record.availability_state === "available" &&
        record.restrictions
          .join(" ")
          .includes("prints no five-order minimum"),
    ),
  );
});

test("all twenty retained source entries carry page-level visual findings", async () => {
  const release = await json(
    "data/sources/current-order-guide-source-release-manifest.json",
  );
  const reviewedIds = new Set([
    22974, 23213, 22944, 23232, 23035, 23233, 23014, 23276, 23015, 23277,
    23016, 23278, 22903, 23195, 22905, 23197, 22904, 23196, 23022, 23260,
  ]);
  const reviewed = release.entries.filter((entry) =>
    reviewedIds.has(entry.vehicle_id),
  );

  assert.equal(reviewed.length, 20);
  assert.ok(
    reviewed.every(
      (entry) =>
        entry.review_status === "cited_pages_visually_reviewed" &&
        entry.cited_pages.every(
          (page) =>
            typeof page.visual_review_status === "string" &&
            typeof page.visual_reviewed_at === "string" &&
            typeof page.visual_review_finding === "string",
        ),
    ),
  );
  assert.equal(
    reviewed
      .flatMap((entry) => entry.cited_pages)
      .filter(
        (page) =>
          page.visual_review_status ===
          "visually_reviewed_no_exterior_color_evidence",
      ).length,
    8,
  );

  const stillPending = release.entries
    .filter((entry) => entry.review_status === "page_located_pending_visual_review")
    .map((entry) => entry.vehicle_id)
    .sort((left, right) => left - right);
  assert.deepEqual(stillPending, [22887, 23079, 23158, 23215]);
});

test("the tranche updater is idempotent and reconciles the remaining queue", async () => {
  const [specialty, release, reconciliation] = await Promise.all([
    json("data/sources/specialty-color-source-candidates.json"),
    json("data/sources/current-order-guide-source-release-manifest.json"),
    json("data/audits/current-model-order-guide-reconciliation.json"),
  ]);
  const once = applyCurrentOrderGuideSpecialtyTranche(specialty, release);
  assert.deepEqual(once.ledger, specialty);
  assert.deepEqual(once.releaseManifest, release);
  assert.deepEqual(
    applyCurrentOrderGuideReconciliation(
      reconciliation,
      once.releaseManifest,
      once.records,
    ),
    reconciliation,
  );

  const byModel = new Map(
    reconciliation.records.map((record) => [record.model_id, record]),
  );
  assert.ok(
    byModel
      .get("tahoe")
      .years.every(
        (year) =>
          year.published_police_ssv_seo_identity_count === 6 &&
          year.omitted_police_ssv_standard_identity_count === 6 &&
          year.omitted_police_ssv_seo_identity_count === 0,
      ),
  );
  assert.ok(
    byModel
      .get("express")
      .years.every((year) => year.missing_specialty_identity_count === 17),
  );
  assert.ok(
    byModel
      .get("silverado-hd")
      .years.every(
        (year) => year.missing_body_series_seo_identity_count === 47,
      ),
  );
});

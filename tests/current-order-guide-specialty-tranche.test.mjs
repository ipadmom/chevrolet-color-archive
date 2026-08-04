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

test("the retained current Order Guide tranche publishes 357 exact rows", async () => {
  const specialty = await json(
    "data/sources/specialty-color-source-candidates.json",
  );
  const rows = specialty.app_publication_records.filter((record) =>
    record.record_id.startsWith("gm-eog-current-"),
  );

  assert.equal(rows.length, 357);
  assert.equal(new Set(rows.map((record) => record.record_id)).size, 357);
  assert.equal(new Set(rows.map((record) => record.source.source_id)).size, 24);
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
    [
      "tahoe",
      "suburban",
      "express",
      "silverado-hd",
      "colorado",
      "blazer-ev",
    ].flatMap((modelId) =>
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
    "tahoe:2025": 9,
    "tahoe:2026": 9,
    "suburban:2025": 3,
    "suburban:2026": 3,
    "express:2025": 54,
    "express:2026": 54,
    "silverado-hd:2025": 93,
    "silverado-hd:2026": 93,
    "colorado:2025": 17,
    "colorado:2026": 14,
    "blazer-ev:2025": 4,
    "blazer-ev:2026": 4,
  });
});

test("Colorado WT rows preserve every printed identity and literal none cell", async () => {
  const specialty = await json(
    "data/sources/specialty-color-source-candidates.json",
  );
  const rows = specialty.app_publication_records.filter(
    (record) =>
      record.record_id.startsWith("gm-eog-current-") &&
      record.catalog_model_ids.includes("colorado"),
  );

  assert.equal(rows.length, 31);
  assert.equal(
    rows.filter((record) => record.model_year === 2025).length,
    17,
  );
  assert.equal(
    rows.filter((record) => record.model_year === 2026).length,
    14,
  );
  assert.equal(
    rows.filter(
      (record) => record.source_seo_code_cell_state === "literal_none",
    ).length,
    23,
  );
  assert.ok(
    rows
      .filter((record) => record.source_seo_code_cell_state === "literal_none")
      .every(
        (record) =>
          record.seo_code === null &&
          record.source_seo_code_raw === "none" &&
          record.availability_state === "available_with_minimum_batch" &&
          record.minimum_batch_units === 5,
      ),
  );

  const yellowByYear = Object.fromEntries(
    [2025, 2026].map((year) => [
      year,
      rows
        .filter((record) => record.model_year === year && record.label === "Yellow")
        .map((record) => record.wa_code),
    ]),
  );
  assert.deepEqual(yellowByYear, {
    2025: ["WA-5456", "WA-9414", "WA-215D", "WA-259L", "WA-478G"],
    2026: ["WA-5456", "WA-9414", "WA-215D", "WA-259L", "WA-478G"],
  });
});

test("Blazer EV police rows preserve the 2025 availability conflict", async () => {
  const specialty = await json(
    "data/sources/specialty-color-source-candidates.json",
  );
  const rows = specialty.app_publication_records.filter(
    (record) =>
      record.record_id.startsWith("gm-eog-current-") &&
      record.catalog_model_ids.includes("blazer-ev"),
  );

  assert.equal(rows.length, 8);
  const expected = [
    ["Victory Red", "5T4", "WA-9260"],
    ["MSP Goose Blue", "9V2", "WA-5665"],
    ["Dark Blue Metallic", "9V7", "WA-722J"],
    ["Silver Ice Metallic", "9W5", "WA-636R"],
  ];
  for (const year of [2025, 2026]) {
    assert.deepEqual(
      rows
        .filter((record) => record.model_year === year)
        .map((record) => [record.label, record.seo_code, record.wa_code]),
      expected,
    );
  }

  const unavailable2025 = rows.filter(
    (record) =>
      record.model_year === 2025 &&
      record.availability_state === "footnoted_not_available_at_revision",
  );
  assert.equal(unavailable2025.length, 3);
  assert.ok(
    unavailable2025.every(
      (record) =>
        record.restrictions.join(" ").includes("Not available at this time") &&
        record.source_literal_anomalies.join(" ").includes(
          "availability column prints A",
        ),
    ),
  );
  assert.ok(
    rows
      .filter((record) => record.model_year === 2026)
      .every(
        (record) =>
          record.availability_state ===
          "available_with_possible_extended_lead" &&
          record.program_code === "9C1/9C3" &&
          record.rpo_code === "9C1/9C3",
      ),
  );
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
  assert.equal(rows.length, 22);
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

  const colorado = rows.filter((record) =>
    record.catalog_model_ids.includes("colorado"),
  );
  assert.equal(colorado.length, 2);
  assert.ok(
    colorado.every(
      (record) =>
        record.minimum_batch_units === 5 &&
        record.availability_state === "available_with_minimum_batch" &&
        record.restrictions.join(" ").includes("Colorado WT"),
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

test("Tahoe and Suburban publish every exact retail and fleet row", async () => {
  const specialty = await json(
    "data/sources/specialty-color-source-candidates.json",
  );
  const rows = specialty.app_publication_records.filter(
    (record) =>
      record.record_id.startsWith("gm-eog-current-") &&
      ["gm-tahoe-retail-fleet-seo-solid-paint-2025-2026", "gm-suburban-seo-solid-paint-2025-2026"].includes(
        record.program_id,
      ),
  );
  const expected = [
    ["Victory Red", "5T4", "WA-9260"],
    ["Woodland Green", "9V5", "WA-9015"],
    ["Wheatland Yellow", "9W3", "WA-253A"],
  ];

  assert.equal(rows.length, 12);
  for (const sourceId of new Set(rows.map((record) => record.source.source_id))) {
    const sourceRows = rows.filter(
      (record) => record.source.source_id === sourceId,
    );
    assert.deepEqual(
      sourceRows.map((record) => [
        record.label,
        record.seo_code,
        record.wa_code,
      ]),
      expected,
    );
    assert.ok(
      sourceRows.every(
        (record) =>
          record.minimum_batch_units === 5 &&
          record.availability_state === "available_with_minimum_batch" &&
          record.interior_availability["Jet Black"] === "A" &&
          record.interior_availability["Gideon / Very Dark Atmosphere"] ===
            "A" &&
          record.unbound_page_notes.length === 1,
      ),
    );
  }
});

test("Express preserves all eighteen rows for all six exact configurations", async () => {
  const specialty = await json(
    "data/sources/specialty-color-source-candidates.json",
  );
  const rows = specialty.app_publication_records.filter(
    (record) =>
      record.record_id.startsWith("gm-eog-current-") &&
      record.catalog_model_ids.includes("express"),
  );
  const expected = [
    ["Yellow", "5ID", "WA-5456"],
    ["Blue", "5IF", "WA-5665"],
    ["Green", "5IL", "WA-7927"],
    ["Inca Gold", "5IK", "WA-7952"],
    ["Silver Metallic", "5IN", "WA-8867"],
    ["Woodland Green", "9V5", "WA-9015"],
    ["Victory Red", "5IP", "WA-9260"],
    ["Yellow", "5IT", "WA-9414"],
    ["Tangier Orange", "9W4", "WA-9417"],
    ["Yellow", "5IZ", "WA-215D"],
    ["Dark Toreador Red", "5I1", "WA-257C"],
    ["Yellow", "5I2", "WA-259L"],
    ["Blue", "5IQ", "WA-451N"],
    ["Yellow", "5I6", "WA-478G"],
    ["Petro Blue", "5I7", "WA-527Y"],
    ["Dark Blue Metallic", "5IH", "WA-722J"],
    ["Silver Birch Metallic", "5IG", "WA-926L"],
    ["Wheatland Yellow", "9W3", "WA-253A"],
  ];

  assert.equal(rows.length, 108);
  for (const sourceId of new Set(rows.map((record) => record.source.source_id))) {
    const sourceRows = rows.filter(
      (record) => record.source.source_id === sourceId,
    );
    assert.deepEqual(
      sourceRows.map((record) => [
        record.label,
        record.seo_code,
        record.wa_code,
      ]),
      expected,
    );
    const passenger = sourceRows[0].source_model_scope[0].includes("Passenger");
    assert.ok(
      sourceRows.every(
        (record) =>
          record.minimum_batch_units === 5 &&
          record.interior_availability["Medium Pewter"] === "A" &&
          (passenger
            ? !("Neutral" in record.interior_availability)
            : record.interior_availability.Neutral === "A") &&
          record.body_component_note.includes("flat Black") &&
          record.possible_extended_lead_time === false,
      ),
    );
  }
});

test("light-HD rows preserve literal none cells, lead time, and 5IS conflict", async () => {
  const specialty = await json(
    "data/sources/specialty-color-source-candidates.json",
  );
  const rows = specialty.app_publication_records.filter(
    (record) =>
      record.record_id.startsWith("gm-eog-current-") &&
      record.catalog_model_ids.includes("silverado-hd") &&
      !record.source_model_scope[0].includes("4500 HD"),
  );
  const expected = [
    ["Woodland Green", "9V5", "WA-9015"],
    ["Doeskin Tan", null, "WA-9403"],
    ["Wheatland Yellow", "9W3", "WA-253A"],
    ["Tangier Orange", "9W4", "WA-9417"],
    ["Dark Toreador Red", null, "WA-334D"],
    ["Unripened Green Metallic", null, "WA-136X"],
    ["Indigo Blue", null, "WA-9792"],
    ["Yellow", null, "WA-5248"],
    ["Yellow", null, "WA-5445"],
    ["Yellow", null, "WA-5456"],
    ["Yellow", null, "WA-9414"],
    ["Orange", null, "WA-770H"],
    ["Blue", null, "WA-454N"],
    ["Light Autumnwood Metallic", null, "WA-228A"],
    ["Pewter", null, "WA-382E"],
    ["Blue", null, "WA-5405"],
    ["Blue", null, "WA-7154"],
    ["Orange", null, "WA-9419"],
    ["Arrival Blue Metallic", null, "WA-815K"],
    ["Green", null, "WA-7927"],
    ["Silver Ice Metallic", "5IS", "WA-636R"],
  ];

  assert.equal(rows.length, 126);
  for (const sourceId of new Set(rows.map((record) => record.source.source_id))) {
    const sourceRows = rows.filter(
      (record) => record.source.source_id === sourceId,
    );
    assert.deepEqual(
      sourceRows.map((record) => [
        record.label,
        record.seo_code,
        record.wa_code,
      ]),
      expected,
    );
    assert.equal(
      sourceRows.filter(
        (record) => record.source_seo_code_cell_state === "literal_none",
      ).length,
      17,
    );
    assert.ok(
      sourceRows
        .filter(
          (record) => record.source_seo_code_cell_state === "literal_none",
        )
        .every(
          (record) =>
            record.seo_code === null &&
            record.source_seo_code_raw === "none",
        ),
    );
    assert.ok(
      sourceRows.every(
        (record) =>
          record.minimum_batch_units === 5 &&
          record.possible_extended_lead_time === true &&
          record.interior_availability["Jet Black"] === "A" &&
          record.interior_availability["Gideon / Very Dark Atmosphere"] ===
            "A" &&
          record.unbound_page_notes.length >= 1,
      ),
    );
  }

  const silverIce = rows.filter(
    (record) =>
      record.label === "Silver Ice Metallic" && record.seo_code === "5IS",
  );
  assert.equal(silverIce.length, 6);
  assert.ok(
    silverIce.every(
      (record) =>
        record.wa_code === "WA-636R" &&
        record.source_literal_anomalies.join(" ").includes("WA-363R"),
    ),
  );
});

test("medium-duty rows retain all thirty literals and unbound APL note", async () => {
  const specialty = await json(
    "data/sources/specialty-color-source-candidates.json",
  );
  const rows = specialty.app_publication_records.filter(
    (record) =>
      record.record_id.startsWith("gm-eog-current-") &&
      record.catalog_model_ids.includes("silverado-hd") &&
      record.source_model_scope[0].includes("4500 HD"),
  );
  const expected = [
    ["Woodland Green", "9V5", "WA-9015"],
    ["Doeskin Tan", "5I9", "WA-9403"],
    ["Wheatland Yellow", "9W3", "WA-253A"],
    ["Tangier Orange", "9W4", "WA-9417"],
    ["Dark Toreador Red", "5I3", "WA-334D"],
    ["Indigo Blue", "5IW", "WA-9792"],
    ["Yellow", "5IA", "WA-5248"],
    ["Yellow", "5IC", "WA-5445"],
    ["Yellow", "5ID", "WA-5456"],
    ["Yellow", "5IT", "WA-9414"],
    ["Orange", "5JA", "WA-770H"],
    ["Blue", "5JD", "WA-454N"],
    ["Unripened Green Metallic", "5IR", "WA-136X"],
    ["Dark Ming Blue", "5IH", "WA-722J"],
    ["Iridium Metallic", "5IE", "WA-121V"],
    ["Pepperdust Metallic", "5II", "WA-441B"],
    ["Yellow", "5IZ", "WA-215D"],
    ["Cyber Gray Metallic", "5IU", "WA-637R"],
    ["Subterranean Metallic", "5I4", "WA-105V"],
    ["Baroque Red Metallic", "5IY", "WA-142X"],
    ["Green", "5IL", "WA-7927"],
    ["Inca Gold", "5IK", "WA-7952"],
    ["Mosaic Black Metallic", "9F5", "WA-384A"],
    ["Graphite Metallic", "9V1", "WA-457B"],
    ["Havana Brown Metallic", "9V4", "WA-439C"],
    ["Satin Steel Metallic", "9W2", "WA-464C"],
    ["Smokey Quartz Metallic", "9V8", "WA-634D"],
    ["Oxford Brown Metallic", "9W1", "WA-334E"],
    ["Deep Ocean Blue Metallic", "9W6", "WA-409Y"],
    ["Shadow Gray Metallic", "9W9", "WA-626D"],
  ];

  assert.equal(rows.length, 60);
  for (const sourceId of new Set(rows.map((record) => record.source.source_id))) {
    const sourceRows = rows.filter(
      (record) => record.source.source_id === sourceId,
    );
    assert.equal(sourceRows.length, 30);
    assert.deepEqual(
      sourceRows.map((record) => [
        record.label,
        record.seo_code,
        record.wa_code,
      ]),
      expected,
    );
    assert.ok(
      sourceRows.every(
        (record) =>
          record.source_seo_code_cell_state === "printed" &&
          record.minimum_batch_units === null &&
          record.availability_state === "available" &&
          record.possible_extended_lead_time === false &&
          record.interior_availability["Jet Black"] === "A" &&
          record.interior_availability[
            "Dark Ash seats with Jet Black interior accents"
          ] === "A" &&
          record.unbound_page_notes.join(" ").includes(
            "APL) Passenger Seat Delete",
          ),
      ),
    );
  }

  const darkMing = rows.filter(
    (record) =>
      record.label === "Dark Ming Blue" &&
      record.seo_code === "5IH" &&
      record.wa_code === "WA-722J",
  );
  assert.equal(darkMing.length, 2);
  assert.ok(
    darkMing.every((record) =>
      record.source_literal_anomalies.join(" ").includes(
        "Dark Blue Metallic 5IH / WA-722J",
      ),
    ),
  );
});

test("all three source-scoped WA-722J variants remain distinct", async () => {
  const specialty = await json(
    "data/sources/specialty-color-source-candidates.json",
  );
  const rows = specialty.app_publication_records.filter(
    (record) =>
      record.record_id.startsWith("gm-eog-current-") &&
      record.wa_code === "WA-722J" &&
      ["tahoe", "express", "silverado-hd"].some((modelId) =>
        record.catalog_model_ids.includes(modelId),
      ),
  );
  const counts = Object.fromEntries(
    [
      ["Dark Blue Metallic|9V7", 2],
      ["Dark Blue Metallic|5IH", 6],
      ["Dark Ming Blue|5IH", 2],
    ].map(([identity]) => [
      identity,
      rows.filter(
        (record) => `${record.label}|${record.seo_code}` === identity,
      ).length,
    ]),
  );
  assert.deepEqual(counts, {
    "Dark Blue Metallic|9V7": 2,
    "Dark Blue Metallic|5IH": 6,
    "Dark Ming Blue|5IH": 2,
  });
});

test("all twenty-four retained source entries carry page-level visual findings", async () => {
  const release = await json(
    "data/sources/current-order-guide-source-release-manifest.json",
  );
  const reviewedIds = new Set([
    22887, 23079, 23158, 23215,
    22974, 23213, 22944, 23232, 23035, 23233, 23014, 23276, 23015, 23277,
    23016, 23278, 22903, 23195, 22905, 23197, 22904, 23196, 23022, 23260,
  ]);
  const reviewed = release.entries.filter((entry) =>
    reviewedIds.has(entry.vehicle_id),
  );

  assert.equal(reviewed.length, 24);
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
  assert.deepEqual(stillPending, []);
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
      .years.every(
        (year) =>
          year.published_specialty_identity_count === 18 &&
          year.published_configuration_row_count === 54 &&
          year.missing_specialty_identity_count === 0,
      ),
  );
  assert.ok(
    byModel
      .get("silverado-hd")
      .years.every(
        (year) =>
          year.published_body_series_seo_identity_count === 48 &&
          year.published_configuration_row_count === 93 &&
          year.missing_body_series_seo_identity_count === 0,
      ),
  );
  assert.deepEqual(
    byModel.get("colorado").years.map((year) => [
      year.model_year,
      year.published_wt_seo_identity_count,
      year.literal_none_color_code_count,
    ]),
    [
      [2025, 17, 13],
      [2026, 14, 10],
    ],
  );
  assert.ok(
    byModel
      .get("blazer-ev")
      .years.every(
        (year) =>
          year.published_police_seo_identity_count === 4 &&
          year.omitted_police_seo_identity_count === 0 &&
          year.omitted_police_standard_identity_count === 6,
      ),
  );
});

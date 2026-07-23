import assert from "node:assert/strict";
import test from "node:test";

import {
  LATER_FLEET_RECORDS,
  LIFECYCLE_ASSERTIONS,
  PROGRAM_DEFINITIONS,
  PROGRAM_SPECS,
  SOURCE_CONTRACTS,
  applyLaterFleetSpecialtyTranche,
  applyReleaseManifest,
  validateManifestContracts,
  validateNoUnresolvedForestRouting,
  validateTrancheContracts,
} from "../scripts/update-2015-2020-specialty-fleet-tranche.mjs";

const exactProgramCounts = {
  "gm-2015-tahoe-5w4-seo-paint": 7,
  "gm-2016-tahoe-9c1-seo-paint": 7,
  "gm-2016-tahoe-5w4-seo-paint": 7,
  "gm-2017-tahoe-9c1-seo-paint": 6,
  "gm-2018-tahoe-9c1-seo-paint": 5,
  "gm-2019-tahoe-5w4-seo-paint": 5,
  "gm-2020-tahoe-5w4-seo-paint": 5,
  "gm-2015-impala-limited-kerr-authorized-upfitter-paint": 30,
  "gm-2016-impala-limited-kerr-authorized-upfitter-paint": 30,
  "gm-2019-suburban-1fl-3500hd-seo-paint": 5,
  "gm-2020-suburban-1fl-seo-paint": 5,
};

const sourcePageMatrix = {
  "gm-2015-tahoe-5w4": [[8], [8], 41],
  "gm-2016-tahoe-9c1": [[8], [8], 42],
  "gm-2016-tahoe-5w4": [[8], [16], 42],
  "gm-2017-tahoe-9c1-4wd": [[10], [6], 46],
  "gm-2018-tahoe-9c1-4wd": [[11], [7], 53],
  "gm-2019-tahoe-5w4": [[10], [6], 45],
  "gm-2020-tahoe-5w4": [[9], [5], 45],
  "gm-2015-impala-limited-9c1-9c3": [[8, 9], [8, 9], 35],
  "gm-2016-impala-limited-9c1-9c3": [[8, 9], [8, 9], 36],
  "gm-2019-suburban-1fl-3500hd": [[10], [6], 28],
  "gm-2020-suburban-1fl": [[10], [6], 26],
};

function countBy(rows, key) {
  return rows.reduce((counts, row) => {
    counts[row[key]] = (counts[row[key]] ?? 0) + 1;
    return counts;
  }, {});
}

function manifestFixture() {
  return {
    schema_version: 1,
    scope: "Fixture retained-source scope.",
    entries: [
      {
        asset_name: "unrelated-source.pdf",
        archive_url: "https://example.test/unrelated-source.pdf",
        sha256: "a".repeat(64),
        bytes: 17,
        role: "unrelated_source",
        source_id: "unrelated-source",
        original_source_url: "https://example.test/original.pdf",
        pdf_page_count: 1,
      },
      {
        asset_name: "source-sha256-manifest.txt",
        archive_url:
          "https://github.com/ipadmom/chevrolet-color-archive/releases/download/brochure-source-archive-v1/source-sha256-manifest.txt",
        sha256: "0".repeat(64),
        bytes: 0,
        role: "checksum_manifest",
        original_source_url: null,
      },
    ],
  };
}

function ledgerFixture() {
  const tahoe2016 = SOURCE_CONTRACTS["gm-2016-tahoe-9c1"];
  return {
    schema_version: 1,
    generated_at: "fixture",
    app_publication_records: [
      {
        record_id: "unrelated-record",
        program_id: "unrelated-program",
        label: "Unrelated Blue",
      },
      {
        record_id: "historic-woodland-record",
        program_id: "unrelated-historic-program",
        label: "Woodland Green",
        paint_code: "46",
        factory_paint_code: "WE9015",
      },
    ],
    program_definitions: [
      {
        program_id: "unrelated-program",
        marker: "preserve-program",
      },
    ],
    program_lifecycle_assertions: [
      {
        assertion_id: "unrelated-lifecycle-assertion",
        marker: "preserve-lifecycle",
      },
    ],
    historic_gm_upfitter_candidates: [
      {
        source_id: tahoe2016.source_id,
        year: 2016,
        model: "Tahoe Police Package",
        url: tahoe2016.url,
        candidate_pages: [8],
        bytes: tahoe2016.bytes,
        sha256: tahoe2016.sha256,
        status: "page_rendered_needs_visual_qc",
        marker: "preserve-source-extra-field",
      },
      {
        source_id: "unrelated-source-candidate",
        marker: "preserve-unrelated-source",
      },
    ],
    verified_not_published: [],
    usda_primary_sources: [],
    comparison_sources: [],
    modern_order_guide_snapshot_candidates: [],
    rejected_or_unresolved_leads: [],
    integrity_audit: {
      publication_boundary:
        "The 2 app_publication_records are the fixture publication boundary.",
      promoted_pdf_pages_visually_rechecked: [],
      artifact_reference_groups: {
        custom_metric: 7,
      },
    },
  };
}

test("the later-fleet tranche preserves the exact audited program and year boundary", () => {
  assert.doesNotThrow(() => validateTrancheContracts());
  assert.equal(LATER_FLEET_RECORDS.length, 112);
  assert.equal(PROGRAM_SPECS.length, 11);
  assert.equal(new Set(PROGRAM_SPECS.map((spec) => spec.program_id)).size, 11);
  assert.deepEqual(countBy(LATER_FLEET_RECORDS, "program_id"), exactProgramCounts);
  assert.deepEqual(countBy(LATER_FLEET_RECORDS, "availability_state"), {
    available: 31,
    available_with_minimum_batch: 21,
    available_through_authorized_upfitter: 60,
  });
  assert.deepEqual(countBy(LATER_FLEET_RECORDS, "application_type"), {
    special_equipment_option_paint: 52,
    authorized_upfitter_post_build: 60,
  });
  assert.deepEqual(
    countBy(LATER_FLEET_RECORDS, "source_seo_code_cell_state"),
    {
      printed: 37,
      em_dash: 11,
      column_absent: 60,
      literal_none: 4,
    },
  );
  assert.deepEqual(countBy(LATER_FLEET_RECORDS, "source_wa_code_cell_state"), {
    printed_with_prefix: 42,
    printed_without_prefix: 70,
  });
  assert.deepEqual(countBy(LATER_FLEET_RECORDS, "factory_installation_claim"), {
    null: 52,
    false: 60,
  });

  const darkBlueYears = LATER_FLEET_RECORDS.filter(
    (record) =>
      record.catalog_model_ids.includes("tahoe") &&
      record.label === "Dark Blue Metallic",
  )
    .map((record) => record.model_year)
    .sort();
  const yellowYears = LATER_FLEET_RECORDS.filter(
    (record) =>
      record.catalog_model_ids.includes("tahoe") &&
      record.label === "Yellow",
  )
    .map((record) => record.model_year)
    .sort();
  assert.deepEqual(darkBlueYears, [2015, 2016, 2016]);
  assert.deepEqual(yellowYears, [2015, 2016, 2016, 2017]);

  const woodland = LATER_FLEET_RECORDS.filter(
    (record) => record.label === "Woodland Green",
  );
  assert.equal(woodland.length, 9);
  assert.ok(
    woodland.every(
      (record) =>
        record.wa_code === "WA-9015" &&
        record.seo_code === "9V5" &&
        record.source_seo_code_raw === "9V5",
    ),
  );

  const minRows = LATER_FLEET_RECORDS.filter(
    (record) => record.availability_state === "available_with_minimum_batch",
  );
  assert.equal(minRows.length, 21);
  assert.ok(minRows.every((record) => record.minimum_batch_units === 5));
  assert.ok(
    LATER_FLEET_RECORDS.filter(
      (record) =>
        record.model_year <= 2016 && record.catalog_model_ids.includes("tahoe"),
    ).every((record) => record.minimum_batch_units === null),
  );

  const tahoe2016Programs = new Set(
    LATER_FLEET_RECORDS.filter(
      (record) =>
        record.model_year === 2016 &&
        record.catalog_model_ids.includes("tahoe"),
    ).map((record) => record.program_id),
  );
  assert.deepEqual(
    [...tahoe2016Programs].sort(),
    [
      "gm-2016-tahoe-5w4-seo-paint",
      "gm-2016-tahoe-9c1-seo-paint",
    ],
  );
  assert.equal(
    LATER_FLEET_RECORDS.some(
      (record) =>
        record.program_id.includes("9c1") && record.program_id.includes("5w4"),
    ),
    false,
  );

  assert.equal(PROGRAM_DEFINITIONS.length, 4);
  const tahoe5w4Definition = PROGRAM_DEFINITIONS.find(
    (definition) =>
      definition.program_id ===
      "gm-tahoe-5w4-seo-paint-2015-2020-reviewed-years",
  );
  assert.deepEqual(
    tahoe5w4Definition.program_ids.map((id) => Number(id.slice(3, 7))),
    [2015, 2016, 2019, 2020],
  );
  assert.equal(
    tahoe5w4Definition.program_ids.some(
      (id) => id.includes("2017") || id.includes("2018"),
    ),
    false,
  );

  assert.equal(LIFECYCLE_ASSERTIONS.length, 1);
  assert.equal(LIFECYCLE_ASSERTIONS[0].record_type, "nonpublication_guard");
  assert.match(LIFECYCLE_ASSERTIONS[0].fact, /11-20-17/);
  assert.equal(
    LATER_FLEET_RECORDS.some(
      (record) => record.label === "Havana Brown Metallic",
    ),
    false,
  );
});

test("Impala Kerr and Suburban tables retain their printed application and raw-cell semantics", () => {
  for (const year of [2015, 2016]) {
    const impala = LATER_FLEET_RECORDS.filter(
      (record) =>
        record.model_year === year &&
        record.catalog_model_ids.includes("impala-limited"),
    );
    assert.equal(impala.length, 30);
    assert.ok(
      impala.every(
        (record) =>
          record.application_type === "authorized_upfitter_post_build" &&
          record.availability_state ===
            "available_through_authorized_upfitter" &&
          record.rpo_code === "9C1/9C3" &&
          record.seo_code === null &&
          record.source_seo_code_raw === null &&
          record.source_seo_code_cell_state === "column_absent" &&
          record.source_wa_code_cell_state === "printed_without_prefix",
      ),
    );
    assert.ok(
      impala.every((record) => record.factory_installation_claim === false),
    );
    const adriatic = impala.find((record) => record.wa_code === "WA-121A");
    assert.deepEqual(adriatic.upfitter_order_codes, {
      code_1: "BEA",
      code_2: "BFE",
      solid_color_option: "AAS",
      two_tone_color_option: "AAT",
    });
    const summit = impala.find((record) => record.wa_code === "WA-8624");
    assert.equal(summit.source_label_raw, "Summit White (50U)");
    assert.equal(summit.upfitter_order_codes.code_1, "BG8");
    assert.equal(summit.upfitter_order_codes.code_2, "BGK");
  }

  const suburban2019 = LATER_FLEET_RECORDS.filter(
    (record) =>
      record.program_id === "gm-2019-suburban-1fl-3500hd-seo-paint",
  );
  assert.equal(suburban2019.length, 5);
  assert.ok(
    suburban2019.every(
      (record) =>
        record.source_model_scope[0] === "2019 Suburban 1FL and 3500HD",
    ),
  );
  const noSeoRows = LATER_FLEET_RECORDS.filter(
    (record) => record.source_seo_code_cell_state === "literal_none",
  );
  assert.equal(noSeoRows.length, 4);
  assert.ok(
    noSeoRows.every(
      (record) =>
        record.source_seo_code_raw === "NONE" &&
        record.seo_code === null &&
        record.source_wa_code_cell_state === "printed_without_prefix" &&
        record.factory_installation_claim === null,
    ),
  );
  const victory = suburban2019.find(
    (record) => record.label === "Victory Red",
  );
  assert.ok(
    victory.restrictions.some((restriction) => restriction.includes("Z71")),
  );
});

test("all eleven retained-source contracts keep the exact reviewed page matrix", () => {
  assert.equal(Object.keys(SOURCE_CONTRACTS).length, 11);
  assert.deepEqual(
    Object.fromEntries(
      Object.values(SOURCE_CONTRACTS).map((source) => [
        source.source_id,
        [
          source.candidate_pages,
          source.printed_pages,
          source.pdf_page_count,
        ],
      ]),
    ),
    sourcePageMatrix,
  );
  assert.ok(
    Object.values(SOURCE_CONTRACTS).every(
      (source) =>
        source.role ===
          "controlling_specialty_vehicle_specification_guide" &&
        Number.isInteger(source.bytes) &&
        source.bytes > 0 &&
        /^[0-9a-f]{64}$/.test(source.sha256) &&
        source.archive_url.endsWith(source.asset_name),
    ),
  );
});

test("Release manifest application is pure, idempotent, and checksum-complete", () => {
  const fixture = manifestFixture();
  const original = structuredClone(fixture);
  const once = applyReleaseManifest(fixture);
  const twice = applyReleaseManifest(once);

  assert.deepEqual(fixture, original);
  assert.deepEqual(twice, once);
  assert.equal(once.entries.length, 13);
  assert.equal(
    once.entries.filter(
      (entry) =>
        entry.role === "controlling_specialty_vehicle_specification_guide",
    ).length,
    11,
  );
  assert.equal(
    once.scope.match(/eleven exact 2015-2020 GM Upfitter/g)?.length,
    1,
  );
  assert.doesNotThrow(() => validateManifestContracts(once));

  const changedBytes = structuredClone(once);
  const sourceEntry = changedBytes.entries.find(
    (entry) => entry.source_id === "gm-2015-tahoe-5w4",
  );
  sourceEntry.bytes += 1;
  assert.throws(
    () => validateManifestContracts(changedBytes),
    /manifest mismatch for bytes/,
  );

  const changedChecksum = structuredClone(once);
  const checksum = changedChecksum.entries.find(
    (entry) => entry.asset_name === "source-sha256-manifest.txt",
  );
  checksum.sha256 = "f".repeat(64);
  assert.throws(
    () => validateManifestContracts(changedChecksum),
    /checksum entry does not cover/,
  );
});

test("ledger application is pure, idempotent, and preserves unrelated state", () => {
  const fixture = ledgerFixture();
  const original = structuredClone(fixture);
  const once = applyLaterFleetSpecialtyTranche(fixture);
  const twice = applyLaterFleetSpecialtyTranche(once);

  assert.deepEqual(fixture, original);
  assert.deepEqual(twice, once);
  assert.equal(once.app_publication_records.length, 114);
  assert.ok(
    once.app_publication_records.some(
      (record) => record.record_id === "unrelated-record",
    ),
  );
  assert.ok(
    once.app_publication_records.some(
      (record) =>
        record.record_id === "historic-woodland-record" &&
        record.paint_code === "46",
    ),
  );
  assert.ok(
    once.program_definitions.some(
      (definition) =>
        definition.program_id === "unrelated-program" &&
        definition.marker === "preserve-program",
    ),
  );
  assert.ok(
    once.program_lifecycle_assertions.some(
      (assertion) =>
        assertion.assertion_id === "unrelated-lifecycle-assertion" &&
        assertion.marker === "preserve-lifecycle",
    ),
  );
  assert.equal(once.historic_gm_upfitter_candidates.length, 12);
  const tahoe2016 = once.historic_gm_upfitter_candidates.find(
    (candidate) => candidate.source_id === "gm-2016-tahoe-9c1",
  );
  assert.equal(tahoe2016.marker, "preserve-source-extra-field");
  assert.equal(tahoe2016.status, "visually_verified_and_published");
  assert.deepEqual(tahoe2016.candidate_pages, [8]);
  assert.deepEqual(tahoe2016.published_model_scopes, [
    "2016 Tahoe 2WD Police Package 9C1",
  ]);
  assert.equal(
    once.integrity_audit.artifact_reference_groups.custom_metric,
    7,
  );
  assert.equal(
    once.integrity_audit.publication_boundary.match(
      /The 2015-2020 later-fleet specialty tranche/g,
    )?.length,
    1,
  );

  const conflicting = ledgerFixture();
  conflicting.historic_gm_upfitter_candidates[0].bytes += 1;
  assert.throws(
    () => applyLaterFleetSpecialtyTranche(conflicting),
    /conflicting retained source candidate gm-2016-tahoe-9c1 field bytes/,
  );
});

test("Forest Service Green remains unresolved and cannot be aliased to Woodland Green", () => {
  assert.doesNotThrow(() =>
    validateNoUnresolvedForestRouting(LATER_FLEET_RECORDS),
  );
  for (const routedIdentity of [
    { label: "Forest Service Green" },
    { source_label_raw: "Forestry Green" },
    { paint_code: "14260" },
    { factory_paint_code: "5032" },
    { wa_code: "WA-14260" },
    { code_display: "5032 / Forest agency paint" },
  ]) {
    assert.throws(
      () =>
        validateNoUnresolvedForestRouting([
          {
            record_id: "unresolved-forest-route",
            ...routedIdentity,
          },
        ]),
      /unresolved Forest Service Green identity entered availability/,
    );
  }
  const woodland = LATER_FLEET_RECORDS.filter(
    (record) => record.label === "Woodland Green",
  );
  assert.ok(
    woodland.every(
      (record) =>
        record.wa_code === "WA-9015" &&
        record.seo_code === "9V5" &&
        !/forest/i.test(record.label),
    ),
  );
});

import assert from "node:assert/strict";
import test from "node:test";

import {
  LIFECYCLE_ASSERTIONS,
  MUNICIPAL_RECORDS,
  PROGRAM_DEFINITIONS,
  SOURCE_CONTRACTS,
  applyMunicipalSpecialtyTranche,
  validateManifestContracts,
  validateNoUnresolvedForestRouting,
  validateTrancheContracts,
} from "../scripts/update-2012-2014-municipal-specialty-tranche.mjs";

const programCounts = {
  "gm-2012-tahoe-ppv-seo-paint": 8,
  "gm-2012-tahoe-5w4-seo-paint": 8,
  "gm-2012-express-1ls-2ls-seo-paint": 15,
  "gm-2012-suburban-1fl-seo-paint": 8,
  "gm-2012-silverado-1wt-tgk-seo-paint": 26,
  "gm-2013-tahoe-ppv-seo-paint": 8,
  "gm-2013-tahoe-5w4-seo-paint": 8,
  "gm-2013-express-1ls-2ls-seo-paint": 15,
  "gm-2013-suburban-1fl-seo-paint": 8,
  "gm-2014-tahoe-ppv-seo-paint": 1,
  "gm-2014-tahoe-5w4-seo-paint": 1,
  "gm-2014-express-1ls-2ls-seo-paint": 15,
  "gm-2014-suburban-1fl-seo-paint": 1,
  "gm-2014-silverado-1wt-seo-paint": 10,
};

function countBy(rows, key) {
  return Object.fromEntries(
    [...new Set(rows.map((row) => row[key]))].map((value) => [
      value,
      rows.filter((row) => row[key] === value).length,
    ]),
  );
}

function sourceManifest() {
  return {
    entries: Object.values(SOURCE_CONTRACTS).map((source) => ({
      asset_name: source.asset_name,
      archive_url: source.archive_url,
      sha256: source.sha256,
      bytes: source.bytes,
      role: source.role,
      source_id: source.source_id,
      original_source_url: source.url,
      pdf_page_count: source.pdf_page_count,
    })),
  };
}

function sourceCandidates() {
  return Object.values(SOURCE_CONTRACTS).map((source) => ({
    source_id: source.source_id,
    url: source.url,
    bytes: source.bytes,
    sha256: source.sha256,
    archive_asset_name: source.asset_name,
    archive_url: source.archive_url,
    pdf_page_count: source.pdf_page_count,
    model: "Impala and Caprice police programs",
    candidate_pages: [],
    status: "retained",
  }));
}

function fixtureLedger() {
  return {
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
      {
        record_id: "preexisting-same-source-program",
        program_id: "preexisting-same-source-program",
        label: "Existing White",
        source_model_scope: ["2012 Caprice Police Package 9C1"],
        source: { source_id: "gm-2012-municipal-manual" },
      },
    ],
    program_definitions: [{ program_id: "unrelated-program" }],
    program_lifecycle_assertions: [
      { assertion_id: "unrelated-lifecycle-assertion" },
    ],
    historic_gm_upfitter_candidates: sourceCandidates(),
    verified_not_published: [],
    usda_primary_sources: [],
    modern_order_guide_snapshot_candidates: [],
    comparison_sources: [],
    rejected_or_unresolved_leads: [],
    integrity_audit: {
      publication_boundary:
        "The 2 app_publication_records entries are the fixture publication boundary.",
      promoted_pdf_pages_visually_rechecked: [],
    },
  };
}

test("municipal specialty tranche retains the exact audited publication boundary", () => {
  assert.doesNotThrow(() => validateTrancheContracts());
  assert.equal(MUNICIPAL_RECORDS.length, 132);
  assert.deepEqual(countBy(MUNICIPAL_RECORDS, "program_id"), programCounts);
  assert.deepEqual(countBy(MUNICIPAL_RECORDS, "availability_state"), {
    available_with_minimum_batch: 122,
    available: 10,
  });
  assert.equal(PROGRAM_DEFINITIONS.length, 5);
  assert.equal(LIFECYCLE_ASSERTIONS.length, 5);

  const silverado2012 = MUNICIPAL_RECORDS.filter(
    ({ program_id: id }) => id === "gm-2012-silverado-1wt-tgk-seo-paint",
  );
  assert.equal(silverado2012.length, 26);
  assert.ok(silverado2012.some(({ paint_code: code }) => code === "WA-9792"));
  assert.equal(
    MUNICIPAL_RECORDS.some(
      ({ model_year: year, catalog_model_ids: ids }) =>
        year === 2013 && ids.includes("silverado"),
    ),
    false,
  );

  const silverado2014 = MUNICIPAL_RECORDS.filter(
    ({ program_id: id }) => id === "gm-2014-silverado-1wt-seo-paint",
  );
  assert.equal(silverado2014.length, 10);
  assert.ok(
    silverado2014.every(
      ({ availability_state: state, minimum_batch_units: units }) =>
        state === "available" && units === null,
    ),
  );

  const active2014TahoeAndSuburban = MUNICIPAL_RECORDS.filter(
    ({ program_id: id }) =>
      id === "gm-2014-tahoe-ppv-seo-paint" ||
      id === "gm-2014-tahoe-5w4-seo-paint" ||
      id === "gm-2014-suburban-1fl-seo-paint",
  );
  assert.deepEqual(
    active2014TahoeAndSuburban.map(({ paint_code: code }) => code),
    ["WA-9260", "WA-9260", "WA-9260"],
  );

  const woodland = MUNICIPAL_RECORDS.filter(
    ({ label }) => label === "Woodland Green",
  );
  assert.equal(woodland.length, 11);
  assert.ok(
    woodland.every(
      ({ paint_code: paintCode, seo_code: seoCode }) =>
        paintCode === "WA-9015" && seoCode === "9V5",
    ),
  );

  const findExpressYellow = (year) =>
    MUNICIPAL_RECORDS.find(
      ({ model_year: modelYear, program_id: id, paint_code: code }) =>
        modelYear === year &&
        id.includes("express-1ls-2ls") &&
        code === "WA-215D",
    );
  assert.deepEqual(
    {
      seo: findExpressYellow(2013).seo_code,
      raw: findExpressYellow(2013).source_seo_code_raw,
      state: findExpressYellow(2013).source_seo_code_cell_state,
    },
    { seo: "Not printed", raw: null, state: "blank" },
  );
  assert.deepEqual(
    {
      seo: findExpressYellow(2014).seo_code,
      raw: findExpressYellow(2014).source_seo_code_raw,
      state: findExpressYellow(2014).source_seo_code_cell_state,
    },
    { seo: "Not stated", raw: "TBD", state: "tbd" },
  );

  const deletions = LIFECYCLE_ASSERTIONS.filter(
    ({ record_type: type }) => type === "color_deletion",
  );
  assert.equal(deletions.length, 3);
  assert.ok(deletions.every(({ deleted_colors: rows }) => rows.length === 7));
  assert.equal(
    LIFECYCLE_ASSERTIONS.some(
      ({ assertion_id: id }) =>
        id === "municipal-specialty-2013-silverado-no-seo-table",
    ),
    true,
  );
});

test("source contracts fail closed when the retained Release manifest drifts", () => {
  const manifest = sourceManifest();
  assert.doesNotThrow(() => validateManifestContracts(manifest));

  const changedBytes = structuredClone(manifest);
  changedBytes.entries[0].bytes += 1;
  assert.throws(
    () => validateManifestContracts(changedBytes),
    /manifest mismatch for bytes/,
  );

  const duplicate = structuredClone(manifest);
  duplicate.entries.push(structuredClone(duplicate.entries[0]));
  assert.throws(
    () => validateManifestContracts(duplicate),
    /manifest must contain exactly one/,
  );
});

test("in-memory application is pure, idempotent, and rejects unresolved forest identities", () => {
  const fixture = fixtureLedger();
  const original = structuredClone(fixture);
  const once = applyMunicipalSpecialtyTranche(fixture);
  const twice = applyMunicipalSpecialtyTranche(once);

  assert.deepEqual(fixture, original);
  assert.deepEqual(twice, once);
  assert.equal(once.app_publication_records.length, 135);
  assert.ok(
    once.app_publication_records.some(
      ({ record_id: id }) => id === "unrelated-record",
    ),
  );
  const candidate2012 = once.historic_gm_upfitter_candidates.find(
    ({ source_id: id }) => id === "gm-2012-municipal-manual",
  );
  assert.ok(
    candidate2012.published_model_scopes.includes(
      "2012 Caprice Police Package 9C1",
    ),
  );
  assert.ok(
    once.program_definitions.some(
      ({ program_id: id }) => id === "unrelated-program",
    ),
  );
  assert.ok(
    once.program_lifecycle_assertions.some(
      ({ assertion_id: id }) => id === "unrelated-lifecycle-assertion",
    ),
  );
  assert.ok(
    once.app_publication_records.some(
      ({ record_id: id, paint_code: code }) =>
        id === "historic-woodland-record" && code === "46",
    ),
  );

  assert.doesNotThrow(() => validateNoUnresolvedForestRouting(MUNICIPAL_RECORDS));
  for (const routedIdentity of [
    { label: "Forest Service Green" },
    { source_label_raw: "Forestry Green" },
    { paint_code: "14260" },
    { factory_paint_code: "5032" },
  ]) {
    assert.throws(
      () =>
        validateNoUnresolvedForestRouting([
          { record_id: "unresolved-forest-route", ...routedIdentity },
        ]),
      /unresolved Forest Service Green identity entered availability/,
    );
  }
});

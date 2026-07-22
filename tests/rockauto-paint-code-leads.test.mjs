import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const ledgerUrl = new URL(
  "data/sources/rockauto-paint-code-leads.json",
  root,
);

async function loadFixture() {
  const [
    ledgerText,
    archiveDataSource,
    archiveSearchSource,
    archiveExplorerSource,
    parquetBuilderSource,
    parquetValidatorSource,
  ] = await Promise.all([
    readFile(ledgerUrl, "utf8"),
    readFile(new URL("app/archive-data.ts", root), "utf8"),
    readFile(new URL("app/archive-search.ts", root), "utf8"),
    readFile(new URL("app/archive-explorer.tsx", root), "utf8"),
    readFile(new URL("scripts/build-normalized-parquet.py", root), "utf8"),
    readFile(new URL("scripts/validate-normalized-parquet.py", root), "utf8"),
  ]);

  return {
    ledger: JSON.parse(ledgerText),
    archiveDataSource,
    archiveSearchSource,
    archiveExplorerSource,
    parquetBuilderSource,
    parquetValidatorSource,
  };
}

function assertUnique(rows, field) {
  const values = rows.map((row) => row[field]);
  assert.equal(
    new Set(values).size,
    values.length,
    `${field} values must be unique`,
  );
}

test("RockAuto lead ledger is valid secondary-source data", async () => {
  const { ledger } = await loadFixture();

  assert.equal(ledger.schema_version, 2);
  assert.equal(ledger.visibility, "public");
  assert.equal(ledger.dataset_kind, "secondary_retailer_paint_code_leads");
  assert.equal(ledger.source.source_id, "rockauto-paint-code-leads");
  assert.equal(ledger.source.officiality, "secondary");
  assert.equal(ledger.source.source_type, "retailer_catalog_fitment");
  assert.equal(ledger.source.claim_type, "retailer_touchup_fitment_lead");
  assert.equal(ledger.scope.part_type_id, "1001876");
  assert.match(ledger.audit_observed_at, /^2026-07-22T\d{2}:\d{2}:\d{2}Z$/);

  assert.equal(ledger.configurations.length, 20);
  assert.equal(ledger.products.length, 28);
  assert.equal(ledger.fitments.length, 111);
  assert.equal(ledger.code_candidates.length, 96);
  assertUnique(ledger.configurations, "catalog_configuration_id");
  assertUnique(ledger.products, "product_id");
  assertUnique(ledger.fitments, "fitment_id");
  assertUnique(ledger.code_candidates, "candidate_id");

  const configurations = new Map(
    ledger.configurations.map((row) => [row.catalog_configuration_id, row]),
  );
  const products = new Map(
    ledger.products.map((row) => [row.product_id, row]),
  );

  for (const configuration of ledger.configurations) {
    assert.equal(
      configuration.catalog_configuration_id,
      `rockauto:cc:${configuration.cc}`,
    );
    assert.equal(configuration.canonical_model_year, configuration.source_year);
    assert.match(configuration.listing_url, /^https:\/\/www\.rockauto\.com\/en\/catalog\//);
    assert.match(configuration.listing_url, new RegExp(`,${configuration.cc},`));
    assert.match(configuration.listing_url, /touch-up\+paint,1001876$/);

    const fitments = ledger.fitments.filter(
      ({ catalog_configuration_id }) =>
        catalog_configuration_id === configuration.catalog_configuration_id,
    );
    assert.equal(fitments.length, configuration.observed_fitment_count);
    assert.equal(
      fitments.filter(
        ({ candidate_status }) =>
          candidate_status === "retailer_touchup_fitment_lead",
      ).length,
      configuration.observed_coded_fitment_count,
    );
    assert.equal(
      fitments.filter(
        ({ candidate_status }) =>
          candidate_status === "excluded_uncoded_universal_product",
      ).length,
      configuration.observed_uncoded_fitment_count,
    );
  }

  for (const fitment of ledger.fitments) {
    const configuration = configurations.get(fitment.catalog_configuration_id);
    const product = products.get(fitment.product_id);
    assert.ok(configuration, `missing configuration for ${fitment.fitment_id}`);
    assert.ok(product, `missing product for ${fitment.fitment_id}`);
    assert.equal(fitment.listing_url, configuration.listing_url);

    const infoUrl = new URL(fitment.info_url);
    assert.equal(infoUrl.origin, "https://www.rockauto.com");
    assert.equal(infoUrl.pathname, "/en/moreinfo.php");
    assert.equal(infoUrl.searchParams.get("pk"), product.pk);
    assert.equal(infoUrl.searchParams.get("cc"), configuration.cc);
    assert.equal(infoUrl.searchParams.get("pt"), "1001876");
  }
});

test("uncoded universal rows cannot become paint-code candidates", async () => {
  const { ledger } = await loadFixture();
  const products = new Map(
    ledger.products.map((row) => [row.product_id, row]),
  );
  const fitments = new Map(
    ledger.fitments.map((row) => [row.fitment_id, row]),
  );

  const universalProducts = ledger.products.filter(
    ({ has_explicit_paint_code }) => !has_explicit_paint_code,
  );
  assert.deepEqual(
    universalProducts.map(({ product_id }) => product_id),
    ["rockauto:pk:9168308"],
  );
  assert.equal(universalProducts[0].product_color_label_raw, "Universal Colors");
  assert.equal(universalProducts[0].paint_code_raw, null);
  assert.match(universalProducts[0].selection_prompt_raw, /Choose Color/);

  for (const candidate of ledger.code_candidates) {
    const product = products.get(candidate.product_id);
    const fitment = fitments.get(candidate.fitment_id);
    assert.ok(product, `missing candidate product ${candidate.product_id}`);
    assert.ok(fitment, `missing candidate fitment ${candidate.fitment_id}`);
    assert.equal(product.has_explicit_paint_code, true);
    assert.ok(product.paint_code_raw);
    assert.equal(candidate.paint_code_raw, product.paint_code_raw);
    assert.equal(candidate.product_id, fitment.product_id);
    assert.equal(fitment.candidate_status, "retailer_touchup_fitment_lead");
    assert.equal(candidate.verification_status, "unverified_secondary_lead");
    assert.equal(candidate.governing_official_source_id, null);
  }

  const candidateProductIds = new Set(
    ledger.code_candidates.map(({ product_id }) => product_id),
  );
  assert.equal(candidateProductIds.has("rockauto:pk:9168308"), false);
  assert.deepEqual(
    ledger.code_candidates.map(({ fitment_id }) => fitment_id).sort(),
    ledger.fitments
      .filter(
        ({ candidate_status }) =>
          candidate_status === "retailer_touchup_fitment_lead",
      )
      .map(({ fitment_id }) => fitment_id)
      .sort(),
  );
});

test("RockAuto C and K Suburban source variants remain explicit", async () => {
  const { ledger } = await loadFixture();
  const inventory = ledger.source_model_variant_inventory.filter(
    ({ source_year, canonical_model_id }) =>
      source_year === 1977 && canonical_model_id === "suburban",
  );

  assert.deepEqual(
    inventory.map(({ source_model_label }) => source_model_label),
    ["C10 SUBURBAN", "C20 SUBURBAN", "K10 SUBURBAN", "K20 SUBURBAN"],
  );
  assert.deepEqual(
    inventory.map(({ source_variant }) => source_variant),
    ["C10", "C20", "K10", "K20"],
  );
  assert.deepEqual(
    inventory.filter(({ product_listing_audited }) => product_listing_audited),
    [inventory[0]],
  );

  const auditedC10 = ledger.configurations.find(
    ({ catalog_configuration_id }) =>
      catalog_configuration_id === "rockauto:cc:1295973",
  );
  assert.equal(auditedC10.source_model_label, "C10 SUBURBAN");
  assert.equal(auditedC10.source_variant, "C10");
  assert.equal(auditedC10.canonical_model_id, "suburban");
});

test("Tahoe 2000-2007 observations remain configuration-scoped secondary leads", async () => {
  const { ledger } = await loadFixture();
  const inventory = ledger.model_route_engine_inventory;
  assert.equal(inventory.length, 8);
  assertUnique(inventory, "inventory_id");

  const expectedInventory = new Map([
    [
      2000,
      [
        { source_engine_label: "4.8L V8", cc: "1361540", full_listing_audited: false },
        { source_engine_label: "5.3L V8", cc: "1361551", full_listing_audited: true },
        { source_engine_label: "5.7L V8", cc: "1361562", full_listing_audited: false },
      ],
    ],
    [
      2001,
      [
        { source_engine_label: "4.8L V8", cc: "1371619", full_listing_audited: false },
        { source_engine_label: "5.3L V8", cc: "1371620", full_listing_audited: true },
      ],
    ],
    [
      2002,
      [
        { source_engine_label: "4.8L V8", cc: "1380361", full_listing_audited: false },
        { source_engine_label: "5.3L V8", cc: "1380372", full_listing_audited: true },
      ],
    ],
    [
      2003,
      [
        { source_engine_label: "4.8L V8", cc: "1412233", full_listing_audited: false },
        { source_engine_label: "5.3L V8", cc: "1412244", full_listing_audited: true },
      ],
    ],
    [
      2004,
      [
        { source_engine_label: "4.8L V8", cc: "1424236", full_listing_audited: false },
        { source_engine_label: "5.3L V8", cc: "1424247", full_listing_audited: true },
      ],
    ],
    [
      2005,
      [
        { source_engine_label: "4.8L V8", cc: "1431159", full_listing_audited: false },
        { source_engine_label: "5.3L V8", cc: "1431156", full_listing_audited: true },
      ],
    ],
    [
      2006,
      [
        { source_engine_label: "4.8L V8", cc: "1432499", full_listing_audited: false },
        { source_engine_label: "5.3L V8", cc: "1434093", full_listing_audited: true },
      ],
    ],
    [
      2007,
      [
        { source_engine_label: "4.8L V8", cc: "1433503", full_listing_audited: false },
        { source_engine_label: "5.3L V8", cc: "1433255", full_listing_audited: true },
      ],
    ],
  ]);
  for (const row of inventory) {
    assert.equal(row.canonical_model_id, "tahoe");
    assert.equal(row.inventory_status, "non_promoted_retrieval_lead");
    assert.equal(row.establishes_factory_availability, false);
    assert.match(
      row.model_route_url,
      new RegExp(`/chevrolet,${row.source_year},tahoe$`),
    );
    assert.deepEqual(
      row.engine_configurations,
      expectedInventory.get(row.source_year),
    );
  }

  const configurations = ledger.configurations.filter(
    ({ canonical_model_id, source_year }) =>
      canonical_model_id === "tahoe" &&
      source_year >= 2000 &&
      source_year <= 2007,
  );
  assert.deepEqual(
    configurations.map(({ cc }) => cc),
    [
      "1361551",
      "1371620",
      "1380372",
      "1412244",
      "1424247",
      "1431156",
      "1434093",
      "1433255",
    ],
  );

  const expectedProductSets = new Map([
    [2000, ["16277369", "16277373", "9168308", "16277273", "16277509", "16277297", "16277301"]],
    [2001, ["16277373", "9168308", "16277273", "16277509", "16277297", "16277361", "16277365", "16277301"]],
    [2002, ["16277313", "16277373", "16277325", "9168308", "16277273", "16277509", "16277241", "16277297", "16277361", "16277365"]],
    [2003, ["16277449", "16277433", "16277313", "16277325", "9168308", "16277273", "16277509", "16277241", "16277297", "16277365", "16277381", "16277389"]],
    [2004, ["16277449", "16277313", "9168308", "16277273", "16277509", "16277365", "16277385", "16277389"]],
    [2005, ["16277449", "16277313", "16277405", "9168308", "16277273", "16277509", "16277385", "16277389"]],
    [2006, ["16277449", "16277313", "16277405", "9168308", "16277273", "16277509", "16277385", "16277389"]],
    [2007, ["16277313", "9168308", "16277273", "16277509", "16277385", "16277417"]],
  ]);
  const configurationIds = new Set(
    configurations.map(({ catalog_configuration_id }) => catalog_configuration_id),
  );
  const fitments = ledger.fitments.filter(({ catalog_configuration_id }) =>
    configurationIds.has(catalog_configuration_id),
  );
  assert.equal(fitments.length, 67);
  assert.equal(
    fitments.filter(
      ({ candidate_status }) =>
        candidate_status === "retailer_touchup_fitment_lead",
    ).length,
    59,
  );
  assert.equal(
    fitments.filter(
      ({ candidate_status }) =>
        candidate_status === "excluded_uncoded_universal_product",
    ).length,
    8,
  );
  assert.equal(new Set(fitments.map(({ product_id }) => product_id)).size, 19);

  for (const configuration of configurations) {
    const pks = fitments
      .filter(
        ({ catalog_configuration_id }) =>
          catalog_configuration_id === configuration.catalog_configuration_id,
      )
      .map(({ product_id }) => product_id.replace("rockauto:pk:", ""));
    assert.deepEqual(pks, expectedProductSets.get(configuration.source_year));
  }

  const sampledFitmentIds = new Set(fitments.map(({ fitment_id }) => fitment_id));
  const candidates = ledger.code_candidates.filter(({ fitment_id }) =>
    sampledFitmentIds.has(fitment_id),
  );
  assert.equal(candidates.length, 59);
  assert.ok(
    candidates.every(
      ({ verification_status, governing_official_source_id }) =>
        verification_status === "unverified_secondary_lead" &&
        governing_official_source_id === null,
    ),
  );
  assert.equal(
    candidates.some(({ product_id }) => product_id === "rockauto:pk:9168308"),
    false,
  );

  const multiCode = ledger.products.find(({ pk }) => pk === "16277369");
  assert.equal(multiCode.paint_code_raw, "WA257C/WA203C/WA334D");
  assert.equal(multiCode.paint_code_normalized, "WA257C/WA203C/WA334D");
});

test("Camaro observations remain engine-scoped and parity stays bounded", async () => {
  const { ledger } = await loadFixture();
  const camaroConfigurations = ledger.configurations.filter(
    ({ canonical_model_id }) => canonical_model_id === "camaro",
  );
  assert.deepEqual(
    camaroConfigurations.map(({ cc }) => cc),
    [
      "1034693",
      "1034738",
      "1434751",
      "1446663",
      "1446645",
      "3449758",
      "3449760",
      "3454665",
    ],
  );

  const expectedProductSets = new Map([
    [1969, ["16277257", "9168308", "16277509"]],
    [
      2011,
      [
        "16277457",
        "16277237",
        "9168308",
        "16277273",
        "16277509",
        "16277361",
        "16277397",
        "16277401",
        "16277497",
      ],
    ],
    [2022, ["16277273", "16277509"]],
    [2024, ["16277273", "16277509"]],
  ]);
  for (const configuration of camaroConfigurations) {
    const pks = ledger.fitments
      .filter(
        ({ catalog_configuration_id }) =>
          catalog_configuration_id === configuration.catalog_configuration_id,
      )
      .map(({ product_id }) => product_id.replace("rockauto:pk:", ""));
    assert.deepEqual(pks, expectedProductSets.get(configuration.source_year));
  }

  assert.equal(ledger.engine_parity_checks.length, 3);
  const parityConfigurations = new Set(
    ledger.engine_parity_checks.flatMap(
      ({ checked_configuration_ids }) => checked_configuration_ids,
    ),
  );
  for (const configurationId of parityConfigurations) {
    assert.ok(
      camaroConfigurations.some(
        ({ catalog_configuration_id }) =>
          catalog_configuration_id === configurationId,
      ),
    );
  }
  for (const parityCheck of ledger.engine_parity_checks) {
    assert.match(parityCheck.result, /^exact_product_set_parity_/);
    assert.match(parityCheck.scope_caveat, /Do not infer parity|does not authorize/);
  }
});

test("ACDelco detail assertions stay product-scoped and vehicle-neutral", async () => {
  const { ledger } = await loadFixture();
  assert.equal(ledger.part_search_observations.length, 1);
  const search = ledger.part_search_observations[0];
  assert.equal(
    search.part_search_url,
    "https://www.rockauto.com/en/partsearch/?mfr=ACDELCO&parttype=1001876",
  );
  assert.equal(search.observed_distinct_product_link_count, 50);
  assert.equal(search.vehicle_scope, null);
  assert.equal(search.completeness_status, "unknown_response_may_be_capped");

  assert.equal(ledger.product_code_crosswalk_assertions.length, 1);
  const assertion = ledger.product_code_crosswalk_assertions[0];
  assert.equal(assertion.product_id, "rockauto:pk:10004972");
  assert.equal(assertion.info_context_cc, "0");
  assert.deepEqual(assertion.specifications_raw, {
    Color: "Summit White",
    "GM Exterior Color RPO": "GAZ",
    "Original Equipment Manufacturers Color Code": "GAZ / WA8624",
  });
  assert.equal(assertion.oem_interchange_numbers_raw, "WA8624");
  assert.equal(assertion.vehicle_scope, null);
  assert.equal(assertion.eligible_for_factory_availability, false);
  assert.equal(
    assertion.verification_status,
    "unverified_secondary_product_crosswalk",
  );

  const product = ledger.products.find(
    ({ product_id }) => product_id === assertion.product_id,
  );
  assert.equal(product.manufacturer, "ACDELCO");
  assert.equal(product.manufacturer_part_number, "19367652");
  assert.equal(
    product.candidate_eligibility,
    "product_level_crosswalk_only_no_vehicle_scope",
  );
  assert.equal(
    ledger.fitments.some(({ product_id }) => product_id === assertion.product_id),
    false,
  );
  assert.equal(
    ledger.code_candidates.some(
      ({ product_id }) => product_id === assertion.product_id,
    ),
    false,
  );
});

test("official comparisons demonstrate that retailer fitments are incomplete or non-equivalent", async () => {
  const { ledger } = await loadFixture();
  const comparisons = new Map(
    ledger.official_completeness_comparisons.map((row) => [row.comparison_id, row]),
  );
  assert.equal(comparisons.size, 7);

  assert.deepEqual(
    [
      comparisons.get("1977-suburban-rockauto-vs-official").official_color_count,
      comparisons.get("1977-suburban-rockauto-vs-official")
        .rockauto_coded_product_count,
    ],
    [15, 1],
  );
  assert.deepEqual(
    [
      comparisons.get("1995-tahoe-rockauto-vs-official").official_color_count,
      comparisons.get("1995-tahoe-rockauto-vs-official")
        .rockauto_coded_product_count,
    ],
    [10, 4],
  );
  assert.deepEqual(
    [
      comparisons.get("2022-tahoe-rockauto-vs-official").official_color_count,
      comparisons.get("2022-tahoe-rockauto-vs-official")
        .rockauto_coded_product_count,
    ],
    [10, 2],
  );
  assert.deepEqual(
    [
      comparisons.get("2000-redesigned-tahoe-rockauto-vs-official")
        .official_color_count,
      comparisons.get("2000-redesigned-tahoe-rockauto-vs-official")
        .rockauto_coded_product_count,
    ],
    [9, 6],
  );
  assert.match(
    comparisons.get("2000-redesigned-tahoe-rockauto-vs-official")
      .official_palette_scope,
    /Redesigned Tahoe/,
  );

  const tahoe2001 = comparisons.get("2001-tahoe-rockauto-vs-official");
  assert.equal(tahoe2001.official_color_count, 9);
  assert.equal(tahoe2001.rockauto_coded_product_count, 7);
  assert.deepEqual(
    tahoe2001.official_color_names.filter((name) =>
      tahoe2001.rockauto_color_labels.includes(name),
    ),
    ["Victory Red"],
  );

  const tahoe2007 = comparisons.get("2007-tahoe-rockauto-vs-official");
  assert.equal(tahoe2007.official_color_count, 9);
  assert.equal(tahoe2007.rockauto_coded_product_count, 5);
  assert.deepEqual(
    tahoe2007.official_color_names.filter((name) =>
      tahoe2007.rockauto_color_labels.includes(name),
    ),
    ["Black"],
  );

  const camaro = comparisons.get("2011-camaro-rockauto-vs-official");
  assert.equal(camaro.official_color_count, 8);
  assert.equal(camaro.rockauto_coded_product_count, 8);
  assert.equal(camaro.cardinality_is_not_completeness, true);
  assert.deepEqual(camaro.official_only_exact_names, [
    "Summit White",
    "Cyber Gray Metallic",
    "Rally Yellow",
    "Inferno Orange Metallic",
    "Silver Ice Metallic",
  ]);
  assert.deepEqual(camaro.rockauto_only_exact_names, [
    "Yellow Zinc",
    "Arctic White",
    "Olympic White",
    "Switchblade Silver Metallic",
    "Red Jewel Tintcoat",
  ]);

  for (const comparison of comparisons.values()) {
    assert.ok(
      comparison.rockauto_coded_product_count < comparison.official_color_count ||
        (comparison.cardinality_is_not_completeness === true &&
          comparison.official_only_exact_names.length > 0 &&
          comparison.rockauto_only_exact_names.length > 0),
    );
  }
});

test("RockAuto leads are isolated from availability and exposed only as route-less regex leads", async () => {
  const {
    ledger,
    archiveDataSource,
    archiveSearchSource,
    archiveExplorerSource,
  } = await loadFixture();

  assert.equal(ledger.publication_policy.import_into_color_availability, false);
  assert.equal(ledger.publication_policy.import_into_search, false);
  assert.equal(
    ledger.publication_policy.import_into_all_fields_regex_search,
    true,
  );
  assert.equal(ledger.publication_policy.import_into_structured_search, false);
  assert.equal(
    ledger.publication_policy.import_into_public_model_year_routes,
    false,
  );
  assert.equal(
    ledger.publication_policy.import_product_crosswalk_assertions_into_search,
    false,
  );
  assert.equal(
    ledger.publication_policy
      .product_crosswalk_assertions_establish_factory_availability,
    false,
  );
  assert.deepEqual(ledger.publication_policy.never_promote_directly_to, [
    "color_availability",
    "evidence_claims",
  ]);

  assert.doesNotMatch(archiveDataSource, /rockauto-paint-code-leads/i);
  assert.doesNotMatch(archiveDataSource, /rockauto\.com/i);
  assert.match(
    archiveSearchSource,
    /data\/sources\/rockauto-paint-code-leads\.json/i,
  );
  assert.match(archiveSearchSource, /buildRockAutoSecondaryLeadSearchRecords/);
  assert.match(archiveSearchSource, /recordKind: "secondary-lead"/);
  assert.match(archiveSearchSource, /researchOnly: true/);
  assert.match(archiveSearchSource, /colorId: null/);
  assert.match(archiveSearchSource, /NOT CHEVROLET FACTORY AVAILABILITY/);
  assert.match(archiveExplorerSource, /disabled=\{record\.researchOnly\}/);
  assert.match(archiveExplorerSource, /if \(!record\.researchOnly\)/);

  for (const configuration of ledger.configurations) {
    assert.equal(
      archiveDataSource.includes(configuration.catalog_configuration_id),
      false,
      `app/archive-data.ts imported ${configuration.catalog_configuration_id}`,
    );
  }
  for (const candidate of ledger.code_candidates) {
    assert.equal(
      archiveDataSource.includes(candidate.candidate_id),
      false,
      `app/archive-data.ts imported ${candidate.candidate_id}`,
    );
  }
});

test("normalized Parquet scripts keep RockAuto in four secondary tables", async () => {
  const { ledger, parquetBuilderSource, parquetValidatorSource } =
    await loadFixture();
  const tableNames = ledger.proposed_normalized_tables.map(
    ({ table_name }) => table_name,
  );
  assert.deepEqual(tableNames, [
    "secondary_catalog_configurations",
    "secondary_paint_products",
    "secondary_paint_fitments",
    "color_code_crosswalk_candidates",
  ]);
  for (const tableName of tableNames) {
    assert.match(parquetBuilderSource, new RegExp(`"${tableName}"`));
    assert.match(parquetValidatorSource, new RegExp(`"${tableName}"`));
  }
  assert.match(parquetBuilderSource, /RockAuto leads cannot enter color_availability/);
  assert.match(parquetValidatorSource, /contaminated primary availability/);
});

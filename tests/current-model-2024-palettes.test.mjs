import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function json(path) {
  return JSON.parse(await readFile(new URL(path, root), "utf8"));
}

test("2024 Fleet Guide publishes only exact current-model page labels", async () => {
  const modern = await json(
    "data/sources/modern-chevrolet-color-source-candidates.json",
  );
  const sourceId = "gm-fleet-guide-us-2024-v3";
  const tables = modern.verified_palette_tables.filter(
    (table) => table.source_id === sourceId && table.model_year === 2024,
  );

  assert.equal(modern.summary.verified_palette_table_count, 93);
  assert.equal(tables.length, 15);
  assert.equal(
    tables.reduce((count, table) => count + table.colors.length, 0),
    132,
  );
  assert.deepEqual(
    new Set(tables.flatMap((table) => table.catalog_model_ids)),
    new Set([
      "blazer",
      "blazer-ev",
      "colorado",
      "corvette",
      "equinox",
      "express",
      "silverado",
      "silverado-ev",
      "silverado-hd",
      "suburban",
      "tahoe",
      "trailblazer",
      "trax",
    ]),
  );

  const byId = new Map(tables.map((table) => [table.table_id, table]));
  const expected = new Map([
    ["blazer-ev", { pages: [17], colors: 8 }],
    ["silverado-ev", { pages: [20], colors: 2 }],
    ["corvette", { pages: [32], colors: 14 }],
    ["trax", { pages: [36], colors: 10 }],
    ["trailblazer", { pages: [37], colors: 9 }],
    ["equinox", { pages: [40], colors: 8 }],
    ["blazer", { pages: [47], colors: 9 }],
    ["tahoe", { pages: [53], colors: 9 }],
    ["suburban", { pages: [54], colors: 9 }],
    ["colorado", { pages: [61], colors: 8 }],
    ["silverado-1500", { pages: [66], colors: 11 }],
    ["silverado-hd", { pages: [70], colors: 9 }],
    ["silverado-3500-chassis-cab", { pages: [76], colors: 10 }],
    ["silverado-4500-6500-hd", { pages: [77], colors: 12 }],
    ["express", { pages: [87, 89, 91], colors: 4 }],
  ]);
  for (const [suffix, exact] of expected) {
    const table = byId.get(`${sourceId}:2024:${suffix}`);
    assert.ok(table, `missing 2024 table ${suffix}`);
    assert.deepEqual(table.pdf_pages, exact.pages);
    assert.equal(table.colors.length, exact.colors);
    assert.equal(
      table.sha256,
      "7511f74a0edee3c396bbe2a42746f75d0d61871897686505f4899e65835c8851",
    );
  }

  assert.equal(
    tables.some((table) => table.catalog_model_ids.includes("traverse")),
    false,
  );
  assert.equal(
    tables.some((table) => table.catalog_model_ids.includes("low-cab-forward")),
    false,
  );
  assert.equal(
    tables.some((table) => table.catalog_model_ids.includes("equinox-ev")),
    false,
  );
  const source = modern.sources.find((entry) => entry.source_id === sourceId);
  assert.match(source.limitations.join(" "), /page 49 is labeled 2023 Traverse/i);
  assert.match(
    source.limitations.join(" "),
    /pages 82-84 are labeled 2025 Low Cab Forward/i,
  );

  const lowCabForward = modern.verified_palette_tables.find(
    (table) =>
      table.table_id ===
      "gm-fleet-guide-us-2023-v3:2024:low-cab-forward",
  );
  assert.ok(lowCabForward);
  assert.deepEqual(lowCabForward.pdf_pages, [77, 78]);
  assert.deepEqual(lowCabForward.catalog_model_ids, ["low-cab-forward"]);
  assert.deepEqual(lowCabForward.colors, [
    "Arc White",
    "Cardinal Red",
    "Dark Blue",
    "Ebony Black",
    "Wheatland Yellow",
    "Woodland Green",
  ]);
  assert.equal(
    lowCabForward.sha256,
    "697423b1c274d8fe30f9e58fc5dc9ecf365d119f7f1155f54dc4c3fd9d8484ef",
  );

  const supplementalSourceId = "gm-fleet-guide-us-2025-v1-r2024-05-29";
  const supplementalSource = modern.sources.find(
    (entry) => entry.source_id === supplementalSourceId,
  );
  assert.ok(supplementalSource);
  assert.equal(
    supplementalSource.document_authority,
    "official_manufacturer_document_archival_mirror",
  );
  assert.equal(supplementalSource.direct_official_url, null);
  assert.equal(
    supplementalSource.retrieval_url,
    "https://xr793.com/wp-content/uploads/2024/06/2025-GM-Envolve-Fleet-Guide.pdf",
  );
  assert.equal(
    supplementalSource.independent_exact_hash_mirror_url,
    "https://manuals.plus/m/6f968d048948ad05e20a27a8c1961ea32bf183d7159c1bd2ffa9d22b689e6867",
  );
  assert.equal(
    supplementalSource.archive_url,
    "https://github.com/ipadmom/chevrolet-color-archive/releases/download/brochure-source-archive-v1/2025-gm-envolve-fleet-guide-v1-r2024-05-29.pdf",
  );
  assert.equal(
    supplementalSource.sha256,
    "6f968d048948ad05e20a27a8c1961ea32bf183d7159c1bd2ffa9d22b689e6867",
  );
  assert.equal(supplementalSource.bytes, 42_424_265);
  assert.equal(supplementalSource.page_count, 104);
  assert.equal(supplementalSource.annual_model_year_coverage_anchor, false);
  assert.match(
    supplementalSource.limitations.join(" "),
    /governing 2024 U\.S\. Order Guide is not retained/i,
  );

  const supplementalTables = modern.verified_palette_tables.filter(
    (entry) => entry.source_id === supplementalSourceId,
  );
  assert.equal(supplementalTables.length, 2);
  const supplementalById = new Map(
    supplementalTables.map((entry) => [entry.table_id, entry]),
  );
  const equinoxEv = supplementalById.get(
    `${supplementalSourceId}:2024:equinox-ev`,
  );
  assert.ok(equinoxEv);
  assert.deepEqual(equinoxEv.pdf_pages, [12]);
  assert.deepEqual(equinoxEv.catalog_model_ids, ["equinox-ev"]);
  assert.deepEqual(equinoxEv.colors, [
    "Black",
    "Galaxy Gray Metallic",
    "Iridescent Pearl Tricoat",
    "Radiant Red Tintcoat",
    "Red Hot",
    "Riptide Blue Metallic",
    "Sterling Gray Metallic",
    "Summit White",
  ]);
  assert.equal(equinoxEv.factory_codes, undefined);
  assert.match(
    equinoxEv.limitations.join(" "),
    /exact trim restrictions remain unresolved/i,
  );

  const traverse = supplementalById.get(
    `${supplementalSourceId}:2024:traverse`,
  );
  assert.ok(traverse);
  assert.deepEqual(traverse.pdf_pages, [41]);
  assert.deepEqual(traverse.catalog_model_ids, ["traverse"]);
  assert.deepEqual(traverse.colors, [
    "Harvest Bronze Metallic",
    "Iridescent Pearl Tricoat",
    "Lakeshore Blue Metallic",
    "Mosaic Black Metallic",
    "Radiant Red Tintcoat",
    "Stardust Metallic",
    "Sterling Gray Metallic",
    "Summit White",
  ]);
  assert.equal(traverse.factory_codes, undefined);
  assert.match(
    traverse.limitations.join(" "),
    /exact trim restrictions remain unresolved/i,
  );
});

test("2024 Fleet Guide restrictions remain attached to exact colors", async () => {
  const modern = await json(
    "data/sources/modern-chevrolet-color-source-candidates.json",
  );
  const table = (suffix) =>
    modern.verified_palette_tables.find(
      (entry) =>
        entry.table_id === `gm-fleet-guide-us-2024-v3:2024:${suffix}`,
    );

  assert.deepEqual(table("silverado-ev").color_restrictions.Black, [
    "Late model year availability.",
  ]);
  assert.deepEqual(table("trax").color_restrictions["Cacti Green"], [
    "Late model year availability.",
  ]);
  assert.deepEqual(
    table("corvette").color_restrictions["Sea Wolf Gray Tricoat"],
    ["Premium paint; additional cost."],
  );
  assert.deepEqual(
    table("blazer-ev").color_restrictions["Iridescent Pearl Tricoat"],
    ["Premium paint; additional charge."],
  );
  assert.deepEqual(
    table("silverado-3500-chassis-cab").color_restrictions[
      "Radiant Red Tintcoat"
    ],
    ["Premium paint; additional cost."],
  );
  assert.deepEqual(
    table("silverado-4500-6500-hd").color_restrictions[
      "Glacier Blue Metallic"
    ],
    ["Premium paint; additional cost."],
  );
  const lowCabForward = modern.verified_palette_tables.find(
    (entry) =>
      entry.table_id ===
      "gm-fleet-guide-us-2023-v3:2024:low-cab-forward",
  );
  assert.deepEqual(lowCabForward.color_restrictions["Woodland Green"], [
    "Shown on the 2024 3500 HG through 5500 XD Low Cab Forward page; the separate 6500 XD/7500 XD page lists Arc White only.",
  ]);
  assert.equal(lowCabForward.color_restrictions["Arc White"], undefined);

  const supplementalTable = (suffix) =>
    modern.verified_palette_tables.find(
      (entry) =>
        entry.table_id ===
        `gm-fleet-guide-us-2025-v1-r2024-05-29:2024:${suffix}`,
    );
  for (const suffix of ["equinox-ev", "traverse"]) {
    assert.deepEqual(
      supplementalTable(suffix).color_restrictions[
        "Iridescent Pearl Tricoat"
      ],
      ["Premium paint; additional charge."],
    );
    assert.deepEqual(
      supplementalTable(suffix).color_restrictions["Radiant Red Tintcoat"],
      ["Premium paint; additional charge."],
    );
  }
});

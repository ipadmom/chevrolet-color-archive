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

  assert.equal(modern.summary.verified_palette_table_count, 80);
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
});

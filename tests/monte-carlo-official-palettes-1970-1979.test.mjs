import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const auditUrl = new URL(
  "data/audits/monte-carlo-official-palettes-1970-1979.json",
  root,
);
const docUrl = new URL("docs/monte-carlo-official-palettes-1970-1979.md", root);
const audit = JSON.parse(await readFile(auditUrl, "utf8"));

const expectedSources = [
  {
    year: 1970,
    id: "gm-heritage-1970-chevrolet-monte-carlo",
    sha256: "d02bfad011cce89e7723bb2d983a9640848cc896e9ffdae531caa9bf54554d51",
    bytes: 3_292_911,
    pages: 109,
    reviewed: [16, 78],
  },
  {
    year: 1971,
    id: "gm-heritage-1971-chevrolet-monte-carlo",
    sha256: "9f6794e9d21eab432160c876c35353b93c7ecfaa367688b106a6e852c402351a",
    bytes: 4_174_076,
    pages: 111,
    reviewed: [44, 110],
  },
  {
    year: 1972,
    id: "gm-heritage-1972-chevrolet-monte-carlo",
    sha256: "9a1a5bcef04bd61a0b2b632301d46af21b95f5dc576a00d7b1dc80fdd830fc6f",
    bytes: 2_948_760,
    pages: 97,
    reviewed: [11, 18, 32, 33],
  },
  {
    year: 1973,
    id: "gm-heritage-1973-chevrolet-monte-carlo",
    sha256: "e1dc6515c3db8cde2990f10660720eba4f79be5e2f98be0c4844c5c6c544d705",
    bytes: 2_887_269,
    pages: 109,
    reviewed: [22, 23, 56, 77],
  },
  {
    year: 1974,
    id: "gm-heritage-1974-chevrolet-monte-carlo",
    sha256: "cbf4f7e7fe3ed0110aa4faf3d89cc8ab9b87924a5628a4e973e96eb7e215d929",
    bytes: 2_879_669,
    pages: 105,
    reviewed: [24, 25, 68],
  },
  {
    year: 1975,
    id: "gm-heritage-1975-chevrolet-monte-carlo",
    sha256: "57c75e86b7b754d0d9a1d425b65693140d4b01fefd14782196930c50485f2700",
    bytes: 2_555_859,
    pages: 95,
    reviewed: [24, 25, 26],
  },
  {
    year: 1976,
    id: "gm-heritage-1976-chevrolet-monte-carlo",
    sha256: "a37a1ad6bbee0ef0a1588bf2560da1b716cdbc43b1152e93765dbbd927d74633",
    bytes: 2_912_195,
    pages: 105,
    reviewed: [24, 25, 26, 97, 99, 101],
  },
  {
    year: 1977,
    id: "gm-heritage-1977-chevrolet-monte-carlo",
    sha256: "c630e124f0f24b527385eb1874a6c08c7f73066e726e66034b44943f742512f2",
    bytes: 2_634_326,
    pages: 99,
    reviewed: [24, 25, 90],
  },
  {
    year: 1978,
    id: "gm-heritage-1978-chevrolet-monte-carlo",
    sha256: "11859f2cb060491da6990f7456a3e92618d125a22f7028c0a2ea0e6dd3d0a5b6",
    bytes: 8_658_198,
    pages: 132,
    reviewed: [30, 98, 110, 111, 112],
  },
  {
    year: 1979,
    id: "gm-heritage-1979-chevrolet-monte-carlo",
    sha256: "d862313a154d3d0fac8a8f4c3951805e8d8a79a1b1657d95e97b2989d22eed73",
    bytes: 6_986_152,
    pages: 143,
    reviewed: [20, 22, 32, 34, 37, 39, 60, 62],
  },
];

const expectedRegularCounts = new Map([
  [1970, 15],
  [1971, 15],
  [1972, 15],
  [1973, 16],
  [1974, 16],
  [1975, 16],
  [1976, 14],
  [1977, 14],
  [1978, 14],
  [1979, 14],
]);

function yearRecord(year) {
  const record = audit.years.find((candidate) => candidate.model_year === year);
  assert.ok(record, `missing model year ${year}`);
  return record;
}

function program(year, id) {
  const found = yearRecord(year).programs.find(
    (candidate) => candidate.program_id === id,
  );
  assert.ok(found, `missing ${year} program ${id}`);
  return found;
}

test("Monte Carlo tranche has the required normalized top-level shape", () => {
  assert.deepEqual(Object.keys(audit), [
    "schema_version",
    "generated_on",
    "model",
    "sources",
    "years",
    "unresolved",
  ]);
  assert.equal(audit.schema_version, 1);
  assert.equal(audit.model.id, "monte-carlo");
  assert.equal(audit.model.name, "Chevrolet Monte Carlo");
  assert.deepEqual(
    audit.model.years,
    Array.from({ length: 10 }, (_, index) => 1970 + index),
  );
  assert.deepEqual(
    audit.years.map((record) => record.model_year),
    audit.model.years,
  );
});

test("all ten official GM sources pin metadata and visually reviewed pages", () => {
  assert.equal(audit.sources.length, expectedSources.length);

  for (const expected of expectedSources) {
    const source = audit.sources.find(
      (candidate) => candidate.source_id === expected.id,
    );
    assert.ok(source, expected.id);
    assert.equal(source.model_year, expected.year);
    assert.equal(source.publisher, "Chevrolet Motor Division, General Motors Corporation");
    assert.equal(source.source_type, "official_vehicle_information_kit_pdf");
    assert.equal(
      source.url,
      `https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/${expected.year}-Chevrolet-Monte-Carlo.pdf`,
    );
    assert.equal(
      source.archive_url,
      `https://github.com/ipadmom/chevrolet-color-archive/releases/download/brochure-source-archive-v1/${expected.year}-chevrolet-monte-carlo-vehicle-information-kit-gm.pdf`,
    );
    assert.equal(source.artifact_sha256, expected.sha256);
    assert.equal(source.artifact_bytes, expected.bytes);
    assert.equal(source.pdf_page_count, expected.pages);
    assert.deepEqual(
      source.reviewed_pages.map((page) => page.pdf_page),
      expected.reviewed,
    );
    for (const page of source.reviewed_pages) {
      assert.equal(typeof page.printed_page === "string" || page.printed_page === null, true);
      assert.ok(page.section.length > 0);
      assert.match(page.visual_verification, /Rendered|rendered/);
    }
    assert.ok(source.limitations.length > 0);
  }
});

test("retained official PDF bytes match all ten pinned source records", async () => {
  for (const expected of expectedSources) {
    const path =
      `tmp/crawler-state/objects/sha256/${expected.sha256.slice(0, 2)}/` +
      `${expected.sha256.slice(2, 4)}/${expected.sha256}.pdf`;
    const url = new URL(path, root);
    const [bytes, metadata] = await Promise.all([readFile(url), stat(url)]);
    assert.equal(metadata.size, expected.bytes, path);
    assert.equal(
      createHash("sha256").update(bytes).digest("hex"),
      expected.sha256,
      path,
    );
  }
});

test("every exact model year has one closed regular palette and no adjacent years", () => {
  assert.equal(audit.years.length, 10);
  for (const [year, expectedCount] of expectedRegularCounts) {
    const record = yearRecord(year);
    assert.equal(record.audit_status, "verified_complete_official_kit_palette");
    assert.equal(record.complete_regular_palette, true);
    assert.deepEqual(record.source_ids, [
      `gm-heritage-${year}-chevrolet-monte-carlo`,
    ]);

    const regular = program(year, "regular_exterior_palette");
    assert.equal(regular.complete, true);
    assert.equal(regular.palette_kind, "regular_body_paint");
    assert.equal(regular.colors.length, expectedCount);
    assert.deepEqual(
      regular.colors.map((color) => color.order),
      Array.from({ length: expectedCount }, (_, index) => index + 1),
    );
  }
  assert.ok(audit.years.every(({ model_year }) => model_year >= 1970 && model_year <= 1979));
});

test("all normalized color rows preserve the required explicit fields", () => {
  const required = [
    "order",
    "label",
    "source_label_raw",
    "factory_code",
    "factory_code_status",
    "component_role",
    "combination_code",
    "restrictions",
  ];

  for (const record of audit.years) {
    for (const entry of record.programs) {
      assert.equal(typeof entry.program_id, "string");
      assert.equal(typeof entry.program_label, "string");
      assert.equal(typeof entry.palette_kind, "string");
      assert.equal(typeof entry.source_scope, "string");
      assert.equal(typeof entry.complete, "boolean");
      for (const color of entry.colors) {
        assert.deepEqual(Object.keys(color), required);
        assert.equal(typeof color.order, "number");
        assert.ok(color.label.length > 0);
        assert.ok(color.source_label_raw.length > 0);
        assert.equal(
          color.factory_code === null || typeof color.factory_code === "string",
          true,
        );
        assert.ok(["printed", "not_printed_on_page"].includes(color.factory_code_status));
        assert.equal(
          color.component_role === null || typeof color.component_role === "string",
          true,
        );
        assert.equal(
          color.combination_code === null || typeof color.combination_code === "string",
          true,
        );
        assert.ok(Array.isArray(color.restrictions));
      }
    }
  }
});

test("official literal conflicts and no-two-tone findings remain explicit", () => {
  const code60 = program(1973, "regular_exterior_palette").colors.find(
    (color) => color.factory_code === "60",
  );
  assert.equal(code60.label, "Yellow Orange Metallic");
  assert.ok(code60.restrictions.some((value) => value.includes("Copper, Light")));

  const code55 = program(1974, "regular_exterior_palette").colors.find(
    (color) => color.factory_code === "55",
  );
  assert.equal(code55.label, "Colonial Gold");
  assert.ok(code55.restrictions.some((value) => value.includes("Sandstone")));

  for (const year of [1973, 1974, 1975]) {
    const twoTone = program(year, "factory_two_tone");
    assert.equal(twoTone.complete, true);
    assert.deepEqual(twoTone.colors, []);
  }
});

test("component colors and custom combinations do not pollute regular palettes", () => {
  const regular1976 = program(1976, "regular_exterior_palette");
  assert.equal(regular1976.colors.some((color) => color.factory_code === "16"), false);
  const fashion1976 = program(1976, "fashion_tone_styling");
  assert.equal(fashion1976.colors.length, 7);
  assert.ok(
    fashion1976.colors.some((color) =>
      color.restrictions.some((value) => value.includes("Code 16")),
    ),
  );

  const regular1979 = program(1979, "regular_exterior_palette");
  assert.equal(regular1979.colors.some((color) => ["16", "85"].includes(color.factory_code)), false);
  const d84 = program(1979, "custom_two_tone_d84");
  assert.equal(d84.complete, true);
  assert.equal(d84.colors.length, 6);
  assert.ok(d84.colors.some((color) => color.combination_code === "RPO D84 15-16"));
  assert.ok(d84.colors.some((color) => color.combination_code === "RPO D84 22-85"));

  for (const year of audit.years) {
    const regular = year.programs.find(
      (candidate) => candidate.program_id === "regular_exterior_palette",
    );
    assert.equal(
      regular.colors.some((color) =>
        /Oyster|cloth|vinyl bench|bucket seat/i.test(color.label),
      ),
      false,
    );
    assert.ok(regular.colors.every((color) => color.component_role === null));
  }
});

test("special styling and roof programs retain their closed exact-year evidence", () => {
  assert.equal(program(1970, "factory_two_tone").colors.length, 7);
  assert.equal(program(1971, "factory_two_tone").colors.length, 6);
  assert.equal(program(1972, "factory_two_tone").colors.length, 5);
  assert.equal(program(1975, "vinyl_roof_covers").colors.length, 7);
  assert.equal(program(1976, "landau_stripe_components").colors.length, 5);
  assert.equal(program(1977, "fashion_tone_styling").colors.length, 3);
  assert.equal(program(1978, "body_side_decor").colors.length, 14);
  assert.equal(program(1979, "regular_body_side_decor").colors.length, 14);

  for (const year of audit.years) {
    const roof = program(year.model_year, "vinyl_roof_covers");
    assert.equal(roof.complete, true);
    assert.ok(roof.colors.every((color) => color.component_role === "vinyl_roof_cover"));
  }
});

test("audit document links every official source and retained Release", async () => {
  const text = await readFile(docUrl, "utf8");
  assert.match(text, /visibility: public/);
  assert.match(text, /Every cited page was rendered and visually reviewed/);
  for (const source of audit.sources) {
    assert.ok(text.includes(source.url), source.source_id);
    assert.ok(text.includes(source.artifact_sha256), source.source_id);
    assert.ok(text.includes(source.artifact_bytes.toLocaleString("en-US")), source.source_id);
  }
  assert.match(text, /brochure-source-archive-v1/);
  assert.match(text, /direct Release `archive_url`/);
});

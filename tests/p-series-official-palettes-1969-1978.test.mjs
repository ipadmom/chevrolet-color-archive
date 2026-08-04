import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const auditUrl = new URL(
  "data/audits/p-series-official-palettes-1969-1978.json",
  root,
);
const docUrl = new URL(
  "docs/p-series-official-palettes-1969-1978.md",
  root,
);
const artifactLedgerUrl = new URL(
  "data/sources/gm-heritage-chevrolet-artifacts.json",
  root,
);
const audit = JSON.parse(await readFile(auditUrl, "utf8"));
const artifactLedger = JSON.parse(await readFile(artifactLedgerUrl, "utf8"));

const expectedSources = [
  {
    id: "gm-heritage-1969-chevrolet-motorhome",
    year: 1969,
    sha256: "c22b72b4784561924d8546d9717b90bd2fcd11c6995e90fd1880bc7b6b9b240f",
    bytes: 852_608,
    pages: 25,
    reviewed: [7, 9, 10, 14, 15],
  },
  {
    id: "gm-heritage-1969-chevrolet-g-van",
    year: 1970,
    sha256: "0b26e6bc4afcaa554d4cde8f99547f0491716aee0af1f3d04f4146602bb5e0cb",
    bytes: 4_424_781,
    pages: 141,
    reviewed: [18, 19, 37, 39, 40, 49, 51, 52, 61, 62, 63],
  },
  {
    id: "gm-heritage-1970-chevrolet-motorhome",
    year: 1970,
    sha256: "202be26b96e1a6248fa6f48ebfbbc877c0374a84ae4b062b423378b5bbdabaa2",
    bytes: 692_919,
    pages: 23,
    reviewed: [7, 9, 10, 19, 20, 21],
  },
  {
    id: "gm-heritage-1971-chevrolet-motorhome",
    year: 1971,
    sha256: "531e04152d91279b1543fabbe5910c2fbd8ad5d28354135b0af38cda652d8d93",
    bytes: 3_451_083,
    pages: 26,
    reviewed: [21, 23, 24],
  },
  {
    id: "gm-heritage-1972-chevrolet-motorhome",
    year: 1972,
    sha256: "1c383156705ec971e8f10c5ef0a6d01b7b324bbd6328b2c41be45a7a290b0da5",
    bytes: 224_317,
    pages: 9,
    reviewed: [2, 9],
  },
  {
    id: "gm-heritage-1973-chevrolet-motorhome",
    year: 1973,
    sha256: "966156b4aed0cb69b4bf2ee37ea200d42a88eec9c75ae0583c349a748da38631",
    bytes: 343_204,
    pages: 13,
    reviewed: [2, 13],
  },
  {
    id: "gm-heritage-1974-chevrolet-motorhome",
    year: 1974,
    sha256: "ced7d0df96f23cf115e997ede45c59b40e93d2f16decf59a06af1fa673e29694",
    bytes: 6_057_050,
    pages: 28,
    reviewed: [1, 8, 11],
  },
  {
    id: "gm-heritage-1975-chevrolet-motorhome",
    year: 1975,
    sha256: "7ab3665b4630a44c47c78245027f66477db8480be83f9e93ce25bbdee0f35b40",
    bytes: 404_518,
    pages: 15,
    reviewed: [2, 3],
  },
  {
    id: "gm-heritage-1976-chevrolet-motorhome",
    year: 1976,
    sha256: "d12972490e7ca65ab201abf5311eb12021d395dcd395b04ea0b16d5834dcfeac",
    bytes: 785_099,
    pages: 41,
    reviewed: [2, 4],
  },
  {
    id: "gm-heritage-1977-chevrolet-motorhome",
    year: 1977,
    sha256: "548ec53990afe7335b9c446c176d6e9da86088d3b59ad33e702da5ddc6f357d0",
    bytes: 352_983,
    pages: 13,
    reviewed: [2, 3],
  },
  {
    id: "gm-heritage-1978-chevrolet-motorhome",
    year: 1978,
    sha256: "63bdd01897a3cfbda7bb54c039ebac1a7a8dd34fc80832f93962b49279e00d26",
    bytes: 10_733_728,
    pages: 54,
    reviewed: [1, 20, 22, 33, 34, 41, 42, 43, 44, 45, 54],
  },
];

const expectedYearSources = new Map([
  [1969, ["gm-heritage-1969-chevrolet-motorhome"]],
  [
    1970,
    [
      "gm-heritage-1969-chevrolet-g-van",
      "gm-heritage-1970-chevrolet-motorhome",
    ],
  ],
  ...Array.from({ length: 8 }, (_, index) => {
    const year = 1971 + index;
    return [year, [`gm-heritage-${year}-chevrolet-motorhome`]];
  }),
]);

const expected1978Chart = [
  ["BLUE, LITE (Light)", "20"],
  ["BLUE, HAWAIIAN (Medium)", "23"],
  ["BLUE, MARINER (Dark) (M)", "25"],
  ["BROWN, CORDOVA (Dark) (M)", "81"],
  ["BUCKSKIN", "65"],
  ["GREEN, SEAMIST (Light) (M)", "43"],
  ["GREEN, HOLLY (Dark)", "46"],
  ["MAHOGANY", "76"],
  ["RED, CARDINAL (Medium)", "70"],
  ["RED, METALLIC (Dark) (M)", "71"],
  ["RUSSET METALLIC (M)", "68"],
  ["SILVER, SARATOGA (M)", "17"],
  ["TAN, SANTA FE", "60"],
  ["WHITE, FROST", "12"],
  ["YELLOW, COLONIAL", "53"],
  ["Body, Bare Aluminum", "02"],
  ["Body in Prime", "00"],
];

function yearRecord(year) {
  const found = audit.years.find((record) => record.model_year === year);
  assert.ok(found, `missing model year ${year}`);
  return found;
}

function program(year, id) {
  const found = yearRecord(year).programs.find(
    (candidate) => candidate.program_id === id,
  );
  assert.ok(found, `missing ${year} program ${id}`);
  return found;
}

test("P-Series tranche has the required normalized shape and exact years", () => {
  assert.deepEqual(Object.keys(audit), [
    "schema_version",
    "generated_on",
    "model",
    "sources",
    "years",
    "unresolved",
  ]);
  assert.equal(audit.schema_version, 1);
  assert.deepEqual(audit.model, {
    id: "chevrolet-p-series-step-van",
    name: "Chevrolet P-Series / Step-Van / Forward-Control Chassis",
    years: Array.from({ length: 10 }, (_, index) => 1969 + index),
  });
  assert.deepEqual(
    audit.years.map((record) => record.model_year),
    audit.model.years,
  );
});

test("all eleven official sources pin artifact identity and visual review", () => {
  assert.equal(audit.sources.length, expectedSources.length);
  assert.equal(new Set(audit.sources.map((source) => source.source_id)).size, 11);

  for (const expected of expectedSources) {
    const source = audit.sources.find((candidate) => candidate.source_id === expected.id);
    assert.ok(source, expected.id);
    assert.equal(source.model_year, expected.year);
    assert.equal(
      source.publisher,
      "Chevrolet Motor Division, General Motors Corporation",
    );
    assert.equal(source.source_type, "official-vehicle-information-kit-pdf");
    assert.match(source.url, /^https:\/\/www\.gm\.com\/.+\.pdf$/);
    assert.match(
      source.archive_url,
      /^https:\/\/github\.com\/ipadmom\/chevrolet-color-archive\/releases\/download\/brochure-source-archive-v1\//,
    );
    assert.equal(source.artifact_sha256, expected.sha256);
    assert.equal(source.artifact_bytes, expected.bytes);
    assert.equal(source.pdf_page_count, expected.pages);
    assert.deepEqual(
      source.reviewed_pages.map((page) => page.pdf_page),
      expected.reviewed,
    );
    for (const page of source.reviewed_pages) {
      assert.ok(page.pdf_page >= 1 && page.pdf_page <= source.pdf_page_count);
      assert.equal(
        page.printed_page === null || typeof page.printed_page === "string",
        true,
      );
      assert.ok(page.section.length > 0);
      assert.match(page.visual_verification, /Rendered/);
    }
    assert.ok(source.limitations.length > 0);
  }
});

test("pinned source metadata agrees with the complete GM artifact ledger", () => {
  for (const source of audit.sources) {
    const retained = artifactLedger.entries.find(
      (entry) => entry.source_id === source.source_id,
    );
    assert.ok(retained, source.source_id);
    assert.equal(source.url, retained.canonical_url);
    assert.equal(source.artifact_sha256, retained.artifact_sha256);
    assert.equal(source.artifact_bytes, retained.byte_length);
    assert.equal(source.pdf_page_count, retained.pdf_page_count);
  }
});

test("retained official PDF bytes match every pinned source", async () => {
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

test("source routing does not infer adjacent model years", () => {
  for (const [year, sourceIds] of expectedYearSources) {
    assert.deepEqual(yearRecord(year).source_ids, sourceIds);
  }

  const misnamedFile = audit.sources.find(
    (source) => source.source_id === "gm-heritage-1969-chevrolet-g-van",
  );
  assert.equal(misnamedFile.model_year, 1970);
  assert.ok(
    misnamedFile.limitations.some((value) => value.includes("1970 MODELS")),
  );
  assert.equal(yearRecord(1969).source_ids.includes(misnamedFile.source_id), false);
});

test("only the 1978 regular Step-Van chart is complete", () => {
  for (const record of audit.years) {
    assert.equal(record.complete_regular_palette, record.model_year === 1978);
    assert.equal(
      record.audit_status,
      record.model_year === 1978
        ? "complete-official-regular-palette"
        : "partial-official-evidence",
    );
  }

  const closedPrograms = audit.years.flatMap((record) =>
    record.programs.filter((entry) => entry.complete).map((entry) => [
      record.model_year,
      entry.program_id,
    ]),
  );
  assert.deepEqual(closedPrograms, [[1978, "1978-stepvan-solid-color-chart"]]);
});

test("all program and color records preserve the explicit contract", () => {
  const requiredColorKeys = [
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
    assert.deepEqual(Object.keys(record), [
      "model_year",
      "audit_status",
      "complete_regular_palette",
      "source_ids",
      "programs",
      "limitations",
    ]);
    assert.ok(record.limitations.length > 0);
    for (const entry of record.programs) {
      assert.equal(typeof entry.program_id, "string");
      assert.equal(typeof entry.program_label, "string");
      assert.equal(typeof entry.palette_kind, "string");
      assert.equal(typeof entry.source_scope, "string");
      assert.equal(typeof entry.complete, "boolean");
      assert.deepEqual(
        entry.colors.map((color) => color.order),
        Array.from({ length: entry.colors.length }, (_, index) => index + 1),
      );
      for (const color of entry.colors) {
        assert.deepEqual(Object.keys(color), requiredColorKeys);
        assert.ok(color.label.length > 0);
        assert.ok(color.source_label_raw.length > 0);
        assert.equal(
          color.factory_code === null || typeof color.factory_code === "string",
          true,
        );
        assert.ok(
          [
            "body-finish-option-number",
            "not-stated",
            "official-chart-primary-code",
            "paint-option-code",
          ].includes(color.factory_code_status),
        );
        assert.equal(
          color.component_role === null || typeof color.component_role === "string",
          true,
        );
        assert.equal(
          color.combination_code === null ||
            typeof color.combination_code === "string",
          true,
        );
        assert.ok(Array.isArray(color.restrictions));
      }
    }
  }
});

test("1969 through 1971 retain exact Union City finish-option codes", () => {
  const optionCodesByYear = new Map([
    [1969, ["E32", "E32BM", "E33", "E33XH"]],
    [1970, ["E30", "E30AL", "E32", "E32BM", "E33", "E33XH"]],
    [1971, ["E32", "E32BM", "E33", "E33XH"]],
  ]);

  for (const [year, expectedCodes] of optionCodesByYear) {
    const actual = [
      ...new Set(
        yearRecord(year).programs.flatMap((entry) =>
          entry.colors
            .filter((color) => color.factory_code !== null)
            .map((color) => color.factory_code),
        ),
      ),
    ].sort();
    assert.deepEqual(actual, [...expectedCodes].sort());
    assert.ok(
      yearRecord(year).programs.every(
        (entry) => entry.palette_kind === "official-body-finish-options",
      ),
    );
  }
});

test("1972 through 1977 do not manufacture a named regular body palette", () => {
  for (const year of [1972, 1973, 1974, 1975, 1976, 1977]) {
    const record = yearRecord(year);
    assert.equal(record.complete_regular_palette, false);
    assert.ok(
      record.programs.every(
        (entry) => entry.palette_kind === "official-component-finishes",
      ),
    );
    assert.ok(record.programs.every((entry) => entry.complete === false));
  }
});

test("1978 chart preserves all exact labels, codes, and solid-paint limits", () => {
  const chart = program(1978, "1978-stepvan-solid-color-chart");
  assert.equal(chart.palette_kind, "official-exterior-color-chart");
  assert.equal(chart.complete, true);
  assert.deepEqual(
    chart.colors.map((color) => [color.source_label_raw, color.factory_code]),
    expected1978Chart.map(([label, code], index) => [
      index === 15 ? "Body, Bare Aluminum (Aluminum Step-Van only)" : label,
      code,
    ]),
  );
  assert.deepEqual(
    chart.colors.map((color) => color.combination_code),
    expected1978Chart.map(([, code]) => `${code}/${code}`),
  );
  assert.ok(
    chart.colors.slice(0, 15).every((color) =>
      color.restrictions.some((value) => value.includes("two-tones not available")),
    ),
  );

  const zy1 = program(1978, "1978-stepvan-zy1-body-scope");
  const solidPaint = zy1.colors.find((color) => color.factory_code === "ZY1");
  assert.ok(solidPaint);
  assert.deepEqual(solidPaint.restrictions, [
    "Standard on steel E32 Step-Van models.",
    "Available on aluminum E33 Step-Van models.",
    "All painted areas of the body are painted the same color.",
  ]);
});

test("special applications remain unresolved and USDA codes never become colors", () => {
  const colors = audit.years.flatMap((record) =>
    record.programs.flatMap((entry) => entry.colors),
  );
  const serializedColors = JSON.stringify(colors);
  assert.doesNotMatch(serializedColors, /Forest Service/i);
  assert.doesNotMatch(serializedColors, /14260|5032/);
  assert.ok(
    audit.unresolved.some((value) =>
      value.includes("no Forest Service or other government-fleet color"),
    ),
  );
  assert.ok(
    audit.unresolved.some((value) =>
      value.includes("14260 and 5032 are not bridged"),
    ),
  );
});

test("audit document exposes every official source and every explicit gap", async () => {
  const text = await readFile(docUrl, "utf8");
  assert.match(text, /visibility: public/);
  assert.match(text, /Every cited page was rendered from the retained PDF and visually inspected/);
  assert.match(text, /No complete named P-Series or Step-Van exterior-color chart is retained for 1969-1977/);
  assert.match(text, /does not bridge USDA references `14260` or `5032`/);
  assert.match(text, /All 11 exact files are pinned/);
  assert.match(text, /direct Release `archive_url`/);

  for (const source of audit.sources) {
    assert.ok(text.includes(source.url), source.source_id);
    assert.ok(text.includes(source.artifact_sha256), source.source_id);
    assert.ok(text.includes(String(source.artifact_bytes)), source.source_id);
    for (const page of source.reviewed_pages) {
      const row = text
        .split("\n")
        .find((line) => line.includes(source.artifact_sha256));
      assert.ok(row?.includes(String(page.pdf_page)), `${source.source_id} page ${page.pdf_page}`);
    }
  }
});

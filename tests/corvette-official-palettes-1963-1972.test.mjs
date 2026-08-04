import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function json(path) {
  return JSON.parse(await readFile(new URL(path, root), "utf8"));
}

const auditPath =
  "data/audits/corvette-official-palettes-1963-1972.json";

const expectedPages = new Map([
  [1963, [10]],
  [1964, [10]],
  [1965, [18]],
  [1966, [17, 20]],
  [1967, [18]],
  [1968, [24]],
  [1969, [82, 85, 114]],
  [1970, [122]],
  [1971, [106]],
  [1972, [79, 89, 106]],
]);

const expectedPrimaryBodyPalettes = new Map([
  [
    1963,
    [
      ["900", "Tuxedo Black"],
      ["912", "Silver Blue (Med)"],
      ["916", "Daytona Blue (Dk)"],
      ["923", "Riverside Red"],
      ["932", "Saddle Tan"],
      ["936", "Ermine White"],
      ["941", "Sebring Silver"],
    ],
  ],
  [
    1964,
    [
      ["900", "Tuxedo Black"],
      ["912", "Silver Blue (Med)"],
      ["916", "Daytona Blue (Dk)"],
      ["923", "Riverside Red"],
      ["932", "Saddle Tan"],
      ["936", "Ermine White"],
      ["940", "Satin Silver"],
    ],
  ],
  [
    1965,
    [
      ["AA", "Tuxedo Black"],
      ["CC", "Ermine White"],
      ["FF", "Nassau Blue"],
      ["GG", "Glen Green"],
      ["MM", "Milano Maroon"],
      ["UU", "Rally Red"],
      ["XX", "Goldwood Yellow"],
      ["QQ", "Silver Pearl"],
    ],
  ],
  [
    1966,
    [
      ["900", "Tuxedo Black"],
      ["972", "Ermine White"],
      ["974", "Rally Red"],
      ["976", "Nassau Blue"],
      ["978", "Laguna Blue"],
      ["980", "Trophy Blue"],
      ["982", "Mosport Green"],
      ["984", "Sunfire Yellow"],
      ["986", "Silver Pearl"],
      ["988", "Milano Maroon"],
    ],
  ],
  [
    1967,
    [
      ["900", "Black"],
      ["972", "White"],
      ["974", "Red"],
      ["976", "Med. Brt. Blue"],
      ["977", "Dk. Teal Blue"],
      ["980", "Silver Blue"],
      ["983", "Dk. Green"],
      ["984", "Yellow"],
      ["986", "Silver"],
      ["988", "Maroon"],
    ],
  ],
  [
    1968,
    [
      ["900", "Black"],
      ["972", "White"],
      ["974", "Red"],
      ["976", "Medium Blue"],
      ["978", "Dark Blue"],
      ["983", "Dark Green"],
      ["984", "Yellow"],
      ["986", "Silver"],
      ["988", "Maroon"],
      ["992", "Copper Bronze"],
    ],
  ],
  [
    1969,
    [
      ["900", "Tuxedo Black"],
      ["972", "Can-Am White"],
      ["974", "Monza Red"],
      ["976", "Le Mans Blue"],
      ["990", "Monaco Orange"],
      ["983", "Fathom Green"],
      ["984", "Daytona Yellow"],
      ["986", "Cortez Silver"],
      ["988", "Burgundy"],
      ["980", "Riverside Gold"],
    ],
  ],
  [
    1970,
    [
      ["10", "Classic White"],
      ["14", "Cortez Silver"],
      ["15", "Laguna Gray"],
      ["26", "Mulsanne Blue"],
      ["27", "Bridgehampton Blue"],
      ["44", "Donnybrooke Green"],
      ["51", "Daytona Yellow"],
      ["62", "Ontario Orange"],
      ["72", "Monza Red"],
      ["77", "Marlboro Maroon"],
    ],
  ],
  [
    1971,
    [
      ["10", "Classic White"],
      ["13", "Nevada Silver"],
      ["26", "Mulsanne Blue"],
      ["27", "Bridgehampton Blue"],
      ["48", "Brands Hatch Green"],
      ["52", "Sunflower Yellow"],
      ["76", "Mille Miglia Red"],
      ["91", "War Bonnet Yellow"],
      ["97", "Ontario Orange"],
      ["98", "Steel Cities Gray"],
    ],
  ],
  [
    1972,
    [
      ["37", "Bryar Blue"],
      ["27", "Targa Blue"],
      ["98", "Steel Cities Gray"],
      ["47", "Elkhart Green"],
      ["97", "Ontario Orange"],
      ["76", "Mille Miglia Red"],
      ["14", "Pewter Silver"],
      ["10", "Classic White"],
      ["52", "Sunflower Yellow"],
      ["91", "War Bonnet Yellow"],
    ],
  ],
]);

test("Corvette 1963-1972 audit is complete, normalized, and page-specific", async () => {
  const audit = await json(auditPath);

  assert.equal(audit.schema_version, 1);
  assert.equal(audit.generated_on, "2026-08-04");
  assert.deepEqual(audit.model, {
    id: "corvette",
    name: "Chevrolet Corvette",
    years: [1963, 1964, 1965, 1966, 1967, 1968, 1969, 1970, 1971, 1972],
  });
  assert.equal(audit.sources.length, 10);
  assert.equal(audit.years.length, 10);
  assert.deepEqual(
    audit.years.map((entry) => entry.model_year),
    audit.model.years,
  );

  const sourceIds = new Set(audit.sources.map((source) => source.source_id));
  assert.equal(sourceIds.size, 10);
  for (const source of audit.sources) {
    assert.equal(source.publisher, "General Motors");
    assert.equal(
      source.source_type,
      "official_gm_heritage_vehicle_information_kit",
    );
    assert.match(
      source.archive_url,
      /^https:\/\/github\.com\/ipadmom\/chevrolet-color-archive\/releases\/download\/brochure-source-archive-v1\//,
    );
    assert.match(source.url, /^https:\/\/www\.gm\.com\//);
    assert.match(source.archive_url, /-chevrolet-corvette-vehicle-information-kit-gm\.pdf$/);
    assert.match(source.artifact_sha256, /^[0-9a-f]{64}$/);
    assert.ok(source.artifact_bytes > 0);
    assert.ok(source.pdf_page_count > 0);
    assert.deepEqual(
      source.reviewed_pages.map((page) => page.pdf_page),
      expectedPages.get(source.model_year),
    );
    for (const page of source.reviewed_pages) {
      assert.ok(page.pdf_page >= 1 && page.pdf_page <= source.pdf_page_count);
      assert.ok(Object.hasOwn(page, "printed_page"));
      assert.ok(page.section.length > 0);
      assert.match(page.visual_verification, /Rendered .*visually checked/i);
    }
    assert.ok(source.limitations.length > 0);
  }

  const allowedCodeStatuses = new Set([
    "printed",
    "not_printed",
    "group_code_printed",
    "regular_production_no_code_printed",
    "rpo_not_printed",
    "printed_lower_and_upper",
  ]);
  for (const year of audit.years) {
    assert.equal(year.complete_regular_palette, true);
    assert.deepEqual(year.source_ids, [
      `gm-heritage-${year.model_year}-chevrolet-corvette`,
    ]);
    assert.ok(year.programs.length >= 2);
    assert.ok(year.limitations.length > 0);

    const bodyPrograms = year.programs.filter(
      (program) => program.palette_kind === "regular_body_paint",
    );
    assert.ok(bodyPrograms.length >= 1);
    assert.ok(bodyPrograms.every((program) => program.complete));
    assert.deepEqual(
      bodyPrograms[0].colors.map((color) => [color.factory_code, color.label]),
      expectedPrimaryBodyPalettes.get(year.model_year),
    );

    const expectedCodes = new Set(
      expectedPrimaryBodyPalettes
        .get(year.model_year)
        .map(([factoryCode]) => factoryCode),
    );
    for (const bodyProgram of bodyPrograms) {
      assert.deepEqual(
        new Set(bodyProgram.colors.map((color) => color.factory_code)),
        expectedCodes,
      );
    }

    for (const program of year.programs) {
      assert.ok(program.program_id.length > 0);
      assert.ok(program.program_label.length > 0);
      assert.ok(program.source_scope.length > 0);
      assert.equal(typeof program.complete, "boolean");
      assert.ok(program.colors.length > 0);
      assert.deepEqual(
        program.colors.map((color) => color.order),
        Array.from({ length: program.colors.length }, (_, index) => index + 1),
      );
      for (const color of program.colors) {
        assert.ok(color.label.length > 0);
        assert.ok(color.source_label_raw.length > 0);
        assert.ok(Object.hasOwn(color, "factory_code"));
        assert.ok(allowedCodeStatuses.has(color.factory_code_status));
        assert.ok(Object.hasOwn(color, "component_role"));
        assert.ok(Object.hasOwn(color, "combination_code"));
        assert.ok(Array.isArray(color.restrictions));
        if (color.factory_code === null) {
          assert.notEqual(color.factory_code_status, "printed");
        }
        if (program.palette_kind === "regular_body_paint") {
          assert.equal(color.component_role, "body_paint");
          assert.notEqual(color.factory_code, null);
        } else {
          assert.notEqual(color.component_role, "body_paint");
        }
      }
    }
  }
});

test("retained GM artifact identities match the crawler artifact ledger", async () => {
  const [audit, ledger] = await Promise.all([
    json(auditPath),
    json("data/sources/gm-heritage-chevrolet-artifacts.json"),
  ]);
  const ledgerById = new Map(
    ledger.entries.map((entry) => [entry.source_id, entry]),
  );

  for (const source of audit.sources) {
    const retained = ledgerById.get(source.source_id);
    assert.ok(retained, `missing retained artifact ${source.source_id}`);
    assert.equal(retained.integrity_status, "complete");
    assert.equal(source.url, retained.canonical_url);
    assert.equal(source.title, retained.title);
    assert.equal(source.artifact_sha256, retained.artifact_sha256);
    assert.equal(source.artifact_bytes, retained.byte_length);
    assert.equal(source.pdf_page_count, retained.pdf_page_count);
  }
});

test("official source conflicts and component palettes remain explicit", async () => {
  const audit = await json(auditPath);
  const byYear = new Map(
    audit.years.map((entry) => [entry.model_year, entry]),
  );

  const colorByCode = (program, code) =>
    program.colors.find((color) => color.factory_code === code);

  const year1969 = byYear.get(1969);
  const publication1969 = year1969.programs.find(
    (program) => program.program_id === "regular-body-paint-color-and-trim",
  );
  const body1969 = year1969.programs.find(
    (program) => program.program_id === "regular-body-paint-body-specification",
  );
  assert.equal(colorByCode(publication1969, "990").label, "Monaco Orange");
  assert.equal(colorByCode(body1969, "990").label, "Hugger Orange");
  assert.equal(colorByCode(publication1969, "988").label, "Burgundy");
  assert.equal(colorByCode(body1969, "988").label, "Burgundy Maroon");

  const year1972 = byYear.get(1972);
  const price1972 = year1972.programs.find(
    (program) => program.program_id === "regular-body-paint-price-schedule",
  );
  const publication1972 = year1972.programs.find(
    (program) => program.program_id === "regular-body-paint-color-and-trim",
  );
  const body1972 = year1972.programs.find(
    (program) => program.program_id === "regular-body-paint-body-specification",
  );
  assert.equal(colorByCode(price1972, "98").label, "Steel Cities Gray");
  assert.equal(
    colorByCode(publication1972, "98").label,
    "Steel Cities Gray",
  );
  assert.equal(colorByCode(body1972, "98").label, "Atlanta Gray");

  assert.deepEqual(
    audit.unresolved.map((issue) => issue.issue_id),
    [
      "1969-code-990-and-988-source-label-variance",
      "1972-code-98-source-label-conflict",
    ],
  );
  assert.match(audit.unresolved[0].description, /Monaco Orange.*Hugger Orange/);
  assert.match(
    audit.unresolved[1].description,
    /Steel Cities Gray.*Atlanta Gray/,
  );

  for (const year of audit.years) {
    assert.ok(
      year.programs.some(
        (program) => program.palette_kind === "convertible_top",
      ),
    );
  }
  for (const modelYear of [1968, 1969, 1970, 1971, 1972]) {
    assert.ok(
      byYear
        .get(modelYear)
        .programs.some(
          (program) =>
            program.palette_kind === "removable_hardtop_vinyl_cover",
        ),
    );
  }

  for (const modelYear of [1971, 1972]) {
    const specialCodes = new Set(["91", "97", "98"]);
    const bodyPrograms = byYear
      .get(modelYear)
      .programs.filter((program) => program.palette_kind === "regular_body_paint");
    for (const program of bodyPrograms) {
      for (const code of specialCodes) {
        assert.match(
          colorByCode(program, code).restrictions.join(" "),
          /Firemist/i,
        );
      }
    }
  }
});

test("research note links every official kit and records the visual audit", async () => {
  const [audit, note] = await Promise.all([
    json(auditPath),
    readFile(
      new URL("docs/corvette-official-palettes-1963-1972.md", root),
      "utf8",
    ),
  ]);

  assert.match(note, /visibility: public/);
  assert.match(note, /visual(?:ly)? reviewed/i);
  assert.match(note, /1969.*Monaco Orange.*Hugger Orange/is);
  assert.match(note, /1972.*Steel Cities Gray.*Atlanta Gray/is);
  for (const source of audit.sources) {
    assert.ok(note.includes(source.url), `missing source URL ${source.source_id}`);
    assert.ok(
      note.includes(source.artifact_sha256),
      `missing retained hash ${source.source_id}`,
    );
    for (const page of source.reviewed_pages) {
      assert.match(note, new RegExp(`PDF page ${page.pdf_page}\\b`));
    }
  }
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const root = new URL("../", import.meta.url);
let searchModulePromise;

async function loadSearchModule() {
  searchModulePromise ??= (async () => {
    const [
      source,
      catalogText,
      gapText,
      photoText,
      suburbanSupplementalText,
      rockAutoText,
      tahoePaintSchemeText,
      suburbanPaintSchemeText,
    ] = await Promise.all([
      readFile(new URL("app/archive-search.ts", root), "utf8"),
      readFile(
        new URL("data/catalog/chevrolet-us-nameplates.json", root),
        "utf8",
      ),
      readFile(
        new URL("data/audits/color-research-gap-inventory.json", root),
        "utf8",
      ),
      readFile(
        new URL("data/photos/commons-release-manifest.json", root),
        "utf8",
      ),
      readFile(new URL("data/audits/suburban-2000-2007.json", root), "utf8"),
      readFile(
        new URL("data/sources/rockauto-paint-code-leads.json", root),
        "utf8",
      ),
      readFile(new URL("data/audits/tahoe-1995-2000.json", root), "utf8"),
      readFile(
        new URL("data/audits/suburban-paint-schemes-1977-1999.json", root),
        "utf8",
      ),
    ]);
    const catalog = JSON.parse(catalogText);
    const gap = JSON.parse(gapText);
    const photos = JSON.parse(photoText);
    const suburbanSupplemental = JSON.parse(suburbanSupplementalText);
    const rockAuto = JSON.parse(rockAutoText);
    const tahoePaintSchemes = JSON.parse(tahoePaintSchemeText);
    const suburbanPaintSchemes = JSON.parse(suburbanPaintSchemeText);
    const catalogFixture = {
      models: catalog.models.filter(({ id }) =>
        ["chevelle", "classic-six"].includes(id),
      ),
    };
    const gapFixture = {
      model_years: gap.model_years.filter(
        ({ model_year_key }) => model_year_key === "classic-six:1913",
      ),
    };
    const photoFixture = {
      assets: photos.assets.filter(
        ({ candidate_id }) =>
          candidate_id === "commons-sha1-7eafcbfbc06ed378d5f2",
      ),
    };
    assert.equal(catalogFixture.models.length, 2);
    assert.equal(gapFixture.model_years.length, 1);
    assert.equal(photoFixture.assets.length, 1);

    const preparedSource = source
      .replace(
        /^import modelCatalogData from "\.\.\/data\/catalog\/chevrolet-us-nameplates\.json";\r?\n/m,
        `const modelCatalogData = ${JSON.stringify(catalogFixture)};\n`,
      )
      .replace(
        /^import colorResearchGapData from "\.\.\/data\/audits\/color-research-gap-inventory\.json";\r?\n/m,
        `const colorResearchGapData = ${JSON.stringify(gapFixture)};\n`,
      )
      .replace(
        /^import commonsPhotoManifestData from "\.\.\/data\/photos\/commons-release-manifest\.json";\r?\n/m,
        `const commonsPhotoManifestData = ${JSON.stringify(photoFixture)};\n`,
      )
      .replace(
        /^import suburban2000to2007AuditData from "\.\.\/data\/audits\/suburban-2000-2007\.json";\r?\n/m,
        `const suburban2000to2007AuditData = ${JSON.stringify(suburbanSupplemental)};\n`,
      )
      .replace(
        /^import rockAutoPaintCodeLeadData from "\.\.\/data\/sources\/rockauto-paint-code-leads\.json";\r?\n/m,
        `const rockAutoPaintCodeLeadData = ${JSON.stringify(rockAuto)};\n`,
      )
      .replace(
        /^import tahoePaintSchemeData from "\.\.\/data\/audits\/tahoe-1995-2000\.json";\r?\n/m,
        `const tahoePaintSchemeData = ${JSON.stringify(tahoePaintSchemes)};\n`,
      )
      .replace(
        /^import suburbanPaintSchemeData from "\.\.\/data\/audits\/suburban-paint-schemes-1977-1999\.json";\r?\n/m,
        `const suburbanPaintSchemeData = ${JSON.stringify(suburbanPaintSchemes)};\n`,
      );
    const output = ts.transpileModule(preparedSource, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText;
    return import(
      `data:text/javascript;base64,${Buffer.from(output).toString("base64")}`
    );
  })();
  return searchModulePromise;
}

async function loadArchiveModels() {
  const [
    archiveSource,
    catalogSource,
    platformSource,
    tahoe1995Source,
    tahoe2001Source,
    suburbanEarlySource,
    suburban2000Source,
    suburbanBrochureSource,
    modernColorSource,
    specialtyColorSource,
  ] = await Promise.all([
      readFile(new URL("app/archive-data.ts", root), "utf8"),
      readFile(new URL("data/catalog/chevrolet-us-nameplates.json", root), "utf8"),
      readFile(new URL("data/catalog/chevrolet-platform-eras.json", root), "utf8"),
      readFile(new URL("data/audits/tahoe-1995-2000.json", root), "utf8"),
      readFile(new URL("data/audits/tahoe-2001-2007.json", root), "utf8"),
      readFile(new URL("data/audits/suburban-1969-1976.json", root), "utf8"),
      readFile(new URL("data/audits/suburban-2000-2007.json", root), "utf8"),
      readFile(
        new URL("data/audits/suburban-brochure-palettes-1982-1989-1993.json", root),
        "utf8",
      ),
      readFile(
        new URL("data/sources/modern-chevrolet-color-source-candidates.json", root),
        "utf8",
      ),
      readFile(
        new URL("data/sources/specialty-color-source-candidates.json", root),
        "utf8",
      ),
    ]);
  const source = archiveSource
    .replace(
      /^import modelCatalog from "\.\.\/data\/catalog\/chevrolet-us-nameplates\.json";\r?\n/m,
      `const modelCatalog = ${catalogSource};\n`,
    )
    .replace(
      /^import platformEraData from "\.\.\/data\/catalog\/chevrolet-platform-eras\.json";\r?\n/m,
      `const platformEraData = ${platformSource};\n`,
    )
    .replace(
      /^import tahoe1995to2000Audit from "\.\.\/data\/audits\/tahoe-1995-2000\.json";\r?\n/m,
      `const tahoe1995to2000Audit = ${tahoe1995Source};\n`,
    )
    .replace(
      /^import tahoe2001to2007Audit from "\.\.\/data\/audits\/tahoe-2001-2007\.json";\r?\n/m,
      `const tahoe2001to2007Audit = ${tahoe2001Source};\n`,
    )
    .replace(
      /^import suburban1969to1976Audit from "\.\.\/data\/audits\/suburban-1969-1976\.json";\r?\n/m,
      `const suburban1969to1976Audit = ${suburbanEarlySource};\n`,
    )
    .replace(
      /^import suburban2000to2007Audit from "\.\.\/data\/audits\/suburban-2000-2007\.json";\r?\n/m,
      `const suburban2000to2007Audit = ${suburban2000Source};\n`,
    )
    .replace(
      /^import suburbanBrochurePaletteAudit from "\.\.\/data\/audits\/suburban-brochure-palettes-1982-1989-1993\.json";\r?\n/m,
      `const suburbanBrochurePaletteAudit = ${suburbanBrochureSource};\n`,
    )
    .replace(
      /^import modernColorSourceData from "\.\.\/data\/sources\/modern-chevrolet-color-source-candidates\.json";\r?\n/m,
      `const modernColorSourceData = ${modernColorSource};\n`,
    )
    .replace(
      /^import specialtyColorSourceData from "\.\.\/data\/sources\/specialty-color-source-candidates\.json";\r?\n/m,
      `const specialtyColorSourceData = ${specialtyColorSource};\n`,
    );
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  return (await import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`)).models;
}

function generation({ aliases = [], id, label, years, colors = [], sources = {} }) {
  return {
    id,
    label,
    range: `${years[0]}-${years.at(-1)}`,
    years,
    listingCount: colors.length,
    revisionNote: "fixture",
    sources,
    colors,
    platformAliases: aliases,
    platformConfidence: aliases.length ? "high" : undefined,
  };
}

function fixtureSource(year) {
  return {
    name: "Fixture source",
    chart: `${year} fixture chart`,
    locator: `p. ${year}`,
    revision: year,
    url: `https://example.test/${year}.pdf`,
  };
}

function fixtureColor(year, { code = "A", state = "listed", restriction } = {}) {
  return {
    id: `green-${year}-${code}-${state}`,
    name: "Green",
    swatch: "#456345",
    rowCode: code,
    note: "fixture note",
    availability: {
      [year]: {
        state,
        label: "Green",
        code,
        ...(restriction ? { restriction } : {}),
      },
    },
  };
}

test("year thumbnails remain inside the selected model, continuous run, and platform band", async () => {
  const { nearbyYearThumbnails, relevantYearBand } = await loadSearchModule();
  const model = {
    id: "tahoe",
    name: "Tahoe",
    vehicleClass: "full-size SUV",
    era: "1995-present",
    status: "fixture",
    generations: [
      generation({ id: "reviewed-2001", label: "GMT800 family, GMT820", aliases: ["GMT820"], years: ["2001"] }),
      generation({ id: "pending-2002", label: "GMT800 family, GMT820", aliases: ["GMT820"], years: ["2002", "2003", "2004", "2005", "2006"] }),
      generation({ id: "gmt900", label: "GMT900 family, GMT921", aliases: ["GMT921"], years: ["2007", "2008"] }),
      generation({ id: "reused-after-gap", label: "GMT800 family, GMT820", aliases: ["GMT820"], years: ["2010"] }),
    ],
  };

  assert.deepEqual(relevantYearBand(model, "2003"), ["2001", "2002", "2003", "2004", "2005", "2006"]);
  assert.deepEqual(nearbyYearThumbnails(relevantYearBand(model, "2003"), "2003", 5), ["2001", "2002", "2003", "2004", "2005"]);
  assert.deepEqual(relevantYearBand(model, "2007"), ["2007", "2008"]);
  assert.ok(!relevantYearBand(model, "2003").includes("2007"));
  assert.ok(!relevantYearBand(model, "2003").includes("2010"));
});

test("the real Tahoe 2003 strip includes only the continuous GMT820 band", async () => {
  const [{ buildArchiveMatrix, buildArchiveYearIndexBands, relevantYearBand }, models] = await Promise.all([
    loadSearchModule(),
    loadArchiveModels(),
  ]);
  const tahoe = models.find((model) => model.id === "tahoe");
  assert.ok(tahoe);
  assert.deepEqual(relevantYearBand(tahoe, "2003"), [
    "2001",
    "2002",
    "2003",
    "2004",
    "2005",
    "2006",
  ]);
  assert.ok(!relevantYearBand(tahoe, "2003").includes("2000"));
  assert.ok(!relevantYearBand(tahoe, "2003").includes("2007"));

  const matrix = buildArchiveMatrix(tahoe, "2003");
  const summitWhite = matrix.colors.filter((color) => color.name === "Summit White");
  assert.equal(summitWhite.length, 1);
  assert.deepEqual(Object.keys(summitWhite[0].availability).sort(), [
    "2001",
    "2002",
    "2003",
    "2004",
    "2005",
    "2006",
  ]);
  assert.equal(
    summitWhite[0].rowCode,
    "Not printed; 50U / WA-8624; 50 / WA-8624",
  );

  const year2000Bands = buildArchiveYearIndexBands(tahoe).filter((band) =>
    band.years.includes("2000"),
  );
  assert.equal(year2000Bands.length, 1);
  const matrix2000 = buildArchiveMatrix(tahoe, "2000");
  assert.equal(
    matrix2000.colors.filter((color) => color.availability["2000"]).length,
    19,
  );
  const matrix2000Sources = [
    matrix2000.sources["2000"],
    ...(matrix2000.sources["2000"].supportingSources ?? []),
  ];
  assert.equal(matrix2000Sources.length, 5);
  assert.deepEqual(
    matrix2000Sources.map((source) => source.sourceId).sort(),
    [
      "chevrolet-order-guide-2000-tahoe-z71-page-1-scan",
      "chevrolet-order-guide-2000-tahoe-z71-page-2-scan",
      "chevrolet-order-guide-2000-tahoe-z71-page-3-scan",
      "chevrolet-sales-brochure-2000-tahoe-z71-colors-scan",
      "gm-heritage-2000-chevrolet-tahoe",
    ],
  );
  const kitSource = matrix2000Sources.find(
    (source) => source.sourceId === "gm-heritage-2000-chevrolet-tahoe",
  );
  assert.match(kitSource.chart, /Base and LS Paint Colors/);
  assert.match(kitSource.chart, /LT Paint Colors/);
  assert.match(kitSource.locator, /PDF p\. 18, printed p\. 9/);
  assert.match(kitSource.locator, /PDF pp\. 12 and 13, printed pp\. 3 and 4/);
});

test("year picker coalesces source-status fragments into one platform band", async () => {
  const [{ buildArchiveYearIndexBands }, models] = await Promise.all([
    loadSearchModule(),
    loadArchiveModels(),
  ]);
  const suburban = models.find((model) => model.id === "suburban");
  assert.ok(suburban);

  const actionLineBands = buildArchiveYearIndexBands(suburban).filter(
    (band) => band.label === "Action Line",
  );
  assert.equal(actionLineBands.length, 1);
  assert.deepEqual(actionLineBands[0].years, [
    "1967",
    "1968",
    "1969",
    "1970",
    "1971",
    "1972",
  ]);
  assert.equal(actionLineBands[0].range, "1967\u20131972");
});

test("real Suburban no-chart years remain in exact era-bounded matrices", async () => {
  const [{ buildArchiveMatrix }, models] = await Promise.all([
    loadSearchModule(),
    loadArchiveModels(),
  ]);
  const suburban = models.find((model) => model.id === "suburban");
  assert.ok(suburban);

  const matrix1963 = buildArchiveMatrix(suburban, "1963");
  assert.deepEqual(matrix1963.years, [
    "1960",
    "1961",
    "1962",
    "1963",
    "1964",
    "1965",
    "1966",
  ]);
  assert.deepEqual(matrix1963.reviewedYears, ["1963"]);
  assert.equal(matrix1963.colors.length, 0);

  for (const selectedYear of ["1970", "1971"]) {
    const matrix = buildArchiveMatrix(suburban, selectedYear);
    assert.deepEqual(matrix.years, [
      "1967",
      "1968",
      "1969",
      "1970",
      "1971",
      "1972",
    ]);
    assert.deepEqual(matrix.reviewedYears, ["1969", "1970", "1971", "1972"]);
    assert.equal(
      matrix.colors.filter((color) => color.availability[selectedYear]).length,
      0,
    );
    assert.equal(matrix.colors.length, 30);
  }
});

test("matrix bands retain era years but populate only exact sourced cells", async () => {
  const { buildArchiveMatrix, buildArchiveTimelineSegments } =
    await loadSearchModule();
  const aliases = ["Fixture platform"];
  const model = {
    id: "fixture",
    name: "Fixture",
    vehicleClass: "fixture",
    era: "fixture",
    status: "fixture",
    generations: [
      generation({
        id: "2020",
        label: "Fixture platform",
        aliases,
        years: ["2020"],
        colors: [fixtureColor("2020")],
        sources: { "2020": fixtureSource("2020") },
      }),
      generation({
        id: "2021-pending",
        label: "Fixture platform",
        aliases,
        years: ["2021"],
      }),
      generation({
        id: "2022",
        label: "Fixture platform",
        aliases,
        years: ["2022"],
        colors: [fixtureColor("2022")],
        sources: { "2022": fixtureSource("2022") },
      }),
      generation({
        id: "2023",
        label: "Fixture platform",
        aliases,
        years: ["2023"],
        colors: [fixtureColor("2023", { code: "B" })],
        sources: { "2023": fixtureSource("2023") },
      }),
      generation({
        id: "2024",
        label: "Fixture platform",
        aliases,
        years: ["2024"],
        colors: [
          fixtureColor("2024", {
            state: "restricted",
            restriction: "fleet only",
          }),
        ],
        sources: { "2024": fixtureSource("2024") },
      }),
      generation({
        id: "2025",
        label: "Fixture platform",
        aliases,
        years: ["2025"],
        colors: [
          fixtureColor("2025", {
            state: "restricted",
            restriction: "municipal only",
          }),
        ],
        sources: { "2025": fixtureSource("2025") },
      }),
    ],
  };

  const matrix = buildArchiveMatrix(model, "2022");
  assert.deepEqual(matrix.years, ["2020", "2021", "2022", "2023", "2024", "2025"]);
  assert.deepEqual(matrix.reviewedYears, ["2020", "2022", "2023", "2024", "2025"]);
  assert.equal(matrix.colors.length, 1);
  const green = matrix.colors[0];
  assert.deepEqual(Object.keys(green.availability).sort(), [
    "2020",
    "2022",
    "2023",
    "2024",
    "2025",
  ]);
  assert.equal(green.sourceColorIdsByYear["2020"], "green-2020-A-listed");
  assert.equal(green.sourceColorIdsByYear["2022"], "green-2022-A-listed");
  assert.deepEqual(
    buildArchiveTimelineSegments(green, matrix.years).map(({ years }) => years),
    [["2020"], ["2022"], ["2023"], ["2024"], ["2025"]],
  );
  assert.ok(
    matrix.colors.every((color) =>
      Object.keys(color.availability).every((itemYear) =>
        matrix.reviewedYears.includes(itemYear),
      ),
    ),
  );
});

test("real Tahoe matrices join exact T1XX rows and leave unreviewed era years blank", async () => {
  const [{ buildArchiveMatrix }, models] = await Promise.all([
    loadSearchModule(),
    loadArchiveModels(),
  ]);
  const tahoe = models.find((model) => model.id === "tahoe");
  assert.ok(tahoe);

  for (const selectedYear of ["2025", "2026"]) {
    const matrix = buildArchiveMatrix(tahoe, selectedYear);
    assert.deepEqual(matrix.years, ["2025", "2026"]);
    assert.deepEqual(matrix.reviewedYears, ["2025", "2026"]);
    assert.equal(matrix.colors.length, 9);
    const summitWhite = matrix.colors.filter(
      (color) => color.name === "Summit White",
    );
    assert.equal(summitWhite.length, 1);
    assert.deepEqual(Object.keys(summitWhite[0].availability).sort(), ["2025", "2026"]);
    assert.notEqual(
      summitWhite[0].sourceColorIdsByYear["2025"],
      summitWhite[0].sourceColorIdsByYear["2026"],
    );
  }

  const matrix2022 = buildArchiveMatrix(tahoe, "2022");
  assert.deepEqual(matrix2022.years, ["2021", "2022", "2023", "2024"]);
  assert.deepEqual(matrix2022.reviewedYears, ["2022"]);
  assert.equal(matrix2022.colors.length, 10);
  assert.ok(
    matrix2022.colors.every(
      (color) => Object.keys(color.availability).join() === "2022",
    ),
  );
});

test("real Suburban matrices preserve governing rows and same-year specialty overlays", async () => {
  const [{ buildArchiveMatrix }, models] = await Promise.all([
    loadSearchModule(),
    loadArchiveModels(),
  ]);
  const suburban = models.find((model) => model.id === "suburban");
  assert.ok(suburban);

  const matrix = buildArchiveMatrix(suburban, "1980");
  assert.ok(matrix.years.includes("1982"));
  assert.ok(matrix.reviewedYears.includes("1982"));
  assert.equal(
    matrix.colors.filter((color) => color.availability["1982"]).length,
    10,
  );
  assert.equal(
    matrix.colors.filter((color) => color.availability["1980"]).length,
    16,
  );
  const woodlandGreen = matrix.colors.filter(
    (color) => color.availability["1980"]?.label === "Woodland Green",
  );
  assert.equal(woodlandGreen.length, 1);
  assert.match(
    woodlandGreen[0].sourceColorIdsByYear["1980"],
    /suburban-woodland-green-1980-.*9v5/,
  );
  assert.deepEqual(Object.keys(woodlandGreen[0].availability), ["1980"]);
  const sourceClasses = [
    matrix.sources["1980"],
    ...(matrix.sources["1980"].supportingSources ?? []),
  ].map((source) => source.evidenceClass ?? "governing_chart");
  assert.deepEqual(sourceClasses.sort(), [
    "governing_chart",
    "specialty_palette_subset",
  ]);
});

test("real commercial-model strips stop at sourced era and production boundaries", async () => {
  const [{ relevantYearBand }, models] = await Promise.all([
    loadSearchModule(),
    loadArchiveModels(),
  ]);
  const byId = new Map(models.map((model) => [model.id, model]));

  assert.deepEqual(relevantYearBand(byId.get("p-series-step-van"), "1942"), [
    "1941",
    "1942",
  ]);
  assert.ok(!relevantYearBand(byId.get("p-series-step-van"), "1942").includes("1946"));

  assert.deepEqual(relevantYearBand(byId.get("panel-truck"), "1968"), [
    "1967",
    "1968",
    "1969",
    "1970",
  ]);
  assert.ok(!relevantYearBand(byId.get("panel-truck"), "1968").includes("1966"));

  assert.deepEqual(relevantYearBand(byId.get("sportvan"), "1965"), ["1965", "1966"]);
  assert.ok(!byId.get("sportvan").generations.flatMap(({ years }) => years).includes("1964"));
  assert.ok(byId.get("sportvan").generations.flatMap(({ years }) => years).includes("1996"));

  assert.deepEqual(relevantYearBand(byId.get("b-series-bus-chassis"), "1991"), [
    "1984",
    "1985",
    "1986",
    "1987",
    "1988",
    "1989",
    "1990",
    "1991",
  ]);
  assert.ok(!relevantYearBand(byId.get("b-series-bus-chassis"), "1991").includes("1992"));
  assert.ok(!relevantYearBand(byId.get("b-series-bus-chassis"), "1991").includes("1993"));
});

test("unknown platform groups do not merge merely because their placeholder labels match", async () => {
  const { relevantYearBand } = await loadSearchModule();
  const model = {
    id: "fixture",
    name: "Fixture",
    vehicleClass: "car",
    era: "fixture",
    status: "fixture",
    generations: [
      generation({ id: "unknown-a", label: "Base / era not yet confirmed", years: ["1990", "1991"] }),
      generation({ id: "unknown-b", label: "Base / era not yet confirmed", years: ["1992", "1993"] }),
    ],
  };
  assert.deepEqual(relevantYearBand(model, "1991"), ["1990", "1991"]);
});

test("all-field search indexes specialty and fleet colors without hard-coded names", async () => {
  const { buildArchiveSearchRecords, compileSafeArchivePattern, recordMatchesPattern } =
    await loadSearchModule();
  const specialColor = {
    id: "forest-service-green",
    name: "Forest Service Green",
    swatch: "#51614a",
    rowCode: "9C1-FSG",
    note: "Special fleet paint",
    availability: {
      "1977": {
        state: "restricted",
        label: "Forest Service Green",
        code: "9C1-FSG",
        restriction: "Federal fleet order only",
      },
    },
  };
  const model = {
    id: "suburban",
    name: "Suburban",
    vehicleClass: "full-size SUV",
    era: "1935-present",
    status: "fixture",
    generations: [generation({ id: "1977-chart", label: "R/V series", years: ["1977"], colors: [specialColor] })],
  };
  const records = buildArchiveSearchRecords([model], [], {
    includeDefaultSupplementalRecords: false,
  });
  assert.equal(records.length, 1);
  assert.equal(records[0].colorId, "forest-service-green");
  assert.match(records[0].searchText, /Federal fleet order only/);

  const compiled = compileSafeArchivePattern("forest.*green|9C1");
  assert.equal(compiled.error, null);
  assert.ok(compiled.regex);
  assert.equal(recordMatchesPattern(records[0], compiled.regex), true);
});

test("all-field search indexes catalog aliases, source candidates, and archived photo metadata", async () => {
  const { buildArchiveSearchRecords, compileSafeArchivePattern, recordMatchesPattern } =
    await loadSearchModule();
  const models = [
    {
      id: "classic-six",
      name: "Classic Six",
      vehicleClass: "prewar passenger car",
      era: "1913-1914",
      status: "fixture",
      generations: [
        generation({
          id: "classic-six-1913",
          label: "Series C",
          years: ["1913"],
        }),
      ],
    },
    {
      id: "chevelle",
      name: "Chevelle",
      vehicleClass: "mid-size car",
      era: "1964-1977",
      status: "fixture",
      generations: [
        generation({
          id: "chevelle-1965",
          label: "first generation",
          years: ["1965"],
        }),
      ],
    },
  ];
  const records = buildArchiveSearchRecords(models);

  const aliasPattern = compileSafeArchivePattern("Type C");
  const aliasMatch = records.find(
    (record) =>
      record.recordKind === "model-year" &&
      record.modelId === "classic-six" &&
      recordMatchesPattern(record, aliasPattern.regex),
  );
  assert.ok(aliasMatch);

  const sourcePattern = compileSafeArchivePattern("gm-heritage-1913-chevrolet");
  const sourceMatch = records.find(
    (record) =>
      record.recordKind === "source-candidate" &&
      recordMatchesPattern(record, sourcePattern.regex),
  );
  assert.ok(sourceMatch);
  assert.equal(sourceMatch.modelId, "classic-six");
  assert.equal(sourceMatch.year, "1913");

  const photoPattern = compileSafeArchivePattern(
    "Rich Niewiroski Jr\\.|CC BY 2\\.5|1965ChevroletChevelle-front\\.jpg",
  );
  const photoMatch = records.find(
    (record) =>
      record.recordKind === "photo" &&
      recordMatchesPattern(record, photoPattern.regex),
  );
  assert.ok(photoMatch);
  assert.equal(photoMatch.modelId, "chevelle");
  assert.equal(photoMatch.year, "1965");
  assert.doesNotMatch(photoMatch.searchText, /upload\.wikimedia\.org/);
  assert.doesNotMatch(photoMatch.searchText, /source_original_url/);
});

test("the optional supplemental-record hook accepts future normalized search rows", async () => {
  const { buildArchiveSearchRecords, compileSafeArchivePattern, recordMatchesPattern } =
    await loadSearchModule();
  const model = {
    id: "fixture",
    name: "Fixture",
    vehicleClass: "car",
    era: "fixture",
    status: "fixture",
    generations: [
      generation({ id: "fixture-2000", label: "fixture", years: ["2000"] }),
    ],
  };
  const records = buildArchiveSearchRecords([model], [], {
    includeDefaultSupplementalRecords: false,
    additionalRecords: [
      {
        id: "normalized-row-1",
        modelId: "fixture",
        modelName: "Fixture",
        searchFields: [
          "future normalized field",
          "ABC-123",
          `${"x".repeat(5_000)}terminal-sentinel`,
        ],
        subtitle: "Future normalized data",
        title: "2000 Chevrolet Fixture / normalized record",
        year: "2000",
      },
    ],
  });
  const supplemental = records.find(
    (record) => record.id === "supplemental:normalized-row-1",
  );
  assert.ok(supplemental);
  assert.equal(supplemental.recordKind, "supplemental");
  assert.match(supplemental.searchText, /future normalized field/);
  assert.match(supplemental.searchText, /ABC-123/);
  const terminalPattern = compileSafeArchivePattern("terminal-sentinel");
  assert.equal(recordMatchesPattern(supplemental, terminalPattern.regex), true);
});

test("promoted Suburban palettes no longer emit route-less supplemental records", async () => {
  const {
    buildSuburbanSupplementalColorSearchRecords,
    compileSafeArchivePattern,
    recordMatchesPattern,
  } = await loadSearchModule();
  const records = buildSuburbanSupplementalColorSearchRecords([
    {
      id: "suburban",
      name: "Suburban",
      vehicleClass: "full-size SUV",
      era: "1935-present",
      status: "fixture",
      generations: [],
    },
  ]);

  assert.equal(records.length, 0);
  const pattern = compileSafeArchivePattern("Silver Birch.*replacing Pewter Metallic");
  const matches = records.filter((record) =>
    recordMatchesPattern(record, pattern.regex),
  );
  assert.equal(matches.length, 0);
});

test("RockAuto secondary leads are route-less all-field records", async () => {
  const {
    buildRockAutoSecondaryLeadSearchRecords,
    compileSafeArchivePattern,
    recordMatchesPattern,
  } = await loadSearchModule();
  const models = [
    {
      id: "suburban",
      name: "Suburban",
      vehicleClass: "full-size SUV",
      era: "fixture",
      status: "fixture",
      generations: [
        generation({ id: "suburban-fixture", label: "fixture", years: ["1977", "2022"] }),
      ],
    },
    {
      id: "tahoe",
      name: "Tahoe",
      vehicleClass: "full-size SUV",
      era: "fixture",
      status: "fixture",
      generations: [
        generation({ id: "tahoe-fixture", label: "fixture", years: ["1995", "2022"] }),
      ],
    },
    {
      id: "camaro",
      name: "Camaro",
      vehicleClass: "pony car",
      era: "fixture",
      status: "fixture",
      generations: [
        generation({
          id: "camaro-fixture",
          label: "fixture",
          years: ["1969", "2011", "2022", "2024"],
        }),
      ],
    },
  ];
  const records = buildRockAutoSecondaryLeadSearchRecords(models);

  assert.equal(records.length, 96);
  assert.ok(records.every((record) => record.recordKind === "secondary-lead"));
  assert.ok(records.every((record) => record.researchOnly === true));
  assert.ok(records.every((record) => record.colorId === null));
  assert.ok(
    records.every((record) =>
      record.subtitle.includes("NOT CHEVROLET FACTORY AVAILABILITY"),
    ),
  );

  const pattern = compileSafeArchivePattern("WA177B|Emerald Green Metallic");
  const matches = records.filter((record) =>
    recordMatchesPattern(record, pattern.regex),
  );
  assert.equal(matches.length, 1);
  assert.equal(matches[0].year, "1995");
  assert.equal(matches[0].modelId, "tahoe");
  assert.match(matches[0].searchText, /retailer_touchup_fitment_lead/);
  assert.match(matches[0].searchText, /unverified_secondary_lead/);

  const imperialBluePattern = compileSafeArchivePattern("WA403P");
  const imperialBlueMatches = records.filter((record) =>
    recordMatchesPattern(record, imperialBluePattern.regex),
  );
  assert.equal(imperialBlueMatches.length, 2);
  assert.deepEqual(
    new Set(imperialBlueMatches.map((record) => record.title)),
    new Set([
      "RockAuto secondary lead / 2011 Chevrolet Camaro / 3.6L V6 (cc 1446663) / Imperial Blue Metallic [WA403P]",
      "RockAuto secondary lead / 2011 Chevrolet Camaro / 6.2L V8 (cc 1446645) / Imperial Blue Metallic [WA403P]",
    ]),
  );
});

test("all-field search indexes normalized paint-scheme components and package metadata", async () => {
  const { buildArchiveSearchRecords, compileSafeArchivePattern, recordMatchesPattern } =
    await loadSearchModule();
  const models = [
    {
      id: "tahoe",
      name: "Tahoe",
      vehicleClass: "full-size SUV",
      era: "1995-present",
      status: "fixture",
      generations: [generation({ id: "tahoe", label: "fixture", years: ["1995"] })],
    },
    {
      id: "suburban",
      name: "Suburban",
      vehicleClass: "full-size SUV",
      era: "1935-present",
      status: "fixture",
      generations: [generation({ id: "suburban", label: "fixture", years: ["1977"] })],
    },
  ];
  const paintSchemes = buildArchiveSearchRecords(models).filter(
    (record) => record.recordKind === "paint-scheme",
  );

  assert.equal(paintSchemes.length, 1369);
  assert.equal(
    paintSchemes.filter((record) => record.modelId === "tahoe").length,
    184,
  );
  assert.equal(
    paintSchemes.filter((record) => record.modelId === "suburban").length,
    1185,
  );
  assert.equal(new Set(paintSchemes.map((record) => record.id)).size, 1369);
  assert.ok(paintSchemes.every((record) => record.colorId === null));

  const gunmetalPattern = compileSafeArchivePattern("Gray, Gunmetal|91L");
  const gunmetal = paintSchemes.filter(
    (record) =>
      record.modelId === "tahoe" &&
      record.year === "1995" &&
      recordMatchesPattern(record, gunmetalPattern.regex),
  );
  assert.equal(gunmetal.length, 7);
  assert.ok(gunmetal.every((record) => /secondary Gray, Gunmetal \(91L\)/.test(record.subtitle)));

  const packagePattern = compileSafeArchivePattern("Doeskin/Dark Carmine Red");
  const packageMatches = paintSchemes.filter(
    (record) =>
      record.modelId === "suburban" &&
      record.year === "1981" &&
      recordMatchesPattern(record, packagePattern.regex),
  );
  assert.equal(packageMatches.length, 1);
  assert.match(packageMatches[0].subtitle, /ZY3 \/ ZY5/);
  assert.match(packageMatches[0].searchText, /gm-heritage-1981-chevrolet-suburban/);
  assert.match(packageMatches[0].searchText, /PDF p\. 27/);
  assert.match(packageMatches[0].searchText, /August 8, 1980/);

  const zy2WithoutStripe = paintSchemes.filter(
    (record) =>
      record.modelId === "suburban" &&
      record.year === "1989" &&
      record.searchText.includes("ZY2") &&
      record.searchText.includes("The stripe-color column prints a dash for every row."),
  );
  assert.equal(zy2WithoutStripe.length, 48);

  const specialPair = paintSchemes.filter(
    (record) =>
      record.modelId === "suburban" &&
      record.year === "1989" &&
      record.colorCode === "50 / 96",
  );
  assert.equal(specialPair.length, 5);
  assert.equal(
    specialPair.filter((record) => record.searchText.includes("ZY3")).length,
    2,
  );
  assert.equal(
    specialPair.filter((record) => record.searchText.includes("ZY4")).length,
    2,
  );
  assert.ok(
    specialPair.some((record) => record.searchText.includes("Dk. Blue/Slate")),
  );

  const d85Matches = paintSchemes.filter(
    (record) =>
      record.modelId === "suburban" &&
      record.year === "1992" &&
      record.subtitle.includes("D85 stripe Victory Red"),
  );
  assert.ok(d85Matches.length > 0);
  assert.ok(d85Matches.every((record) => record.searchText.includes("ZY2")));

  const scanLiteral = paintSchemes.filter(
    (record) =>
      record.modelId === "suburban" &&
      record.year === "1996" &&
      record.searchText.includes("Silve [sic, terminal `r` not visible in scan]"),
  );
  assert.equal(scanLiteral.length, 1);
  assert.equal(scanLiteral[0].colorCode, "96U / 41L");

  const artifactHash =
    "46b985c6943036e27efd890122a3d3ffc5d0ba625d19305a978da5d3fec57df9";
  const immutableArtifactMatches = paintSchemes.filter(
    (record) =>
      record.modelId === "suburban" &&
      record.year === "1990" &&
      record.searchText.includes(artifactHash),
  );
  assert.equal(immutableArtifactMatches.length, 135);

  const noLateZy4 = paintSchemes.filter(
    (record) =>
      record.modelId === "suburban" &&
      ["1998", "1999"].includes(record.year) &&
      record.searchText.includes("ZY4"),
  );
  assert.equal(noLateZy4.length, 0);
});

test("all-field search exposes Forest Service Green as an unresolved non-route research lead", async () => {
  const [search, specialtySourceText, explorer] = await Promise.all([
    loadSearchModule(),
    readFile(
      new URL("data/sources/specialty-color-source-candidates.json", root),
      "utf8",
    ),
    readFile(new URL("app/archive-explorer.tsx", root), "utf8"),
  ]);
  const specialty = JSON.parse(specialtySourceText);
  const records = search.buildArchiveSearchRecords([], specialty.search_leads);
  const compiled = search.compileSafeArchivePattern("forest.*service.*green|14260");
  const matches = records.filter((record) =>
    search.recordMatchesPattern(record, compiled.regex),
  );

  assert.equal(matches.length, 1);
  assert.equal(matches[0].researchOnly, true);
  assert.equal(matches[0].modelId, "");
  assert.equal(matches[0].year, "");
  assert.match(matches[0].subtitle, /Chevrolet applicability unresolved/);
  assert.match(explorer, /specialtyColorSourceData\.search_leads/);
  assert.match(explorer, /disabled=\{record\.researchOnly\}/);
  assert.match(
    explorer,
    /THIS IS AN EXACT, REVIEWED SPECIALTY-PAINT SUBSET[^\n]+NOT THE COMPLETE MODEL-YEAR EXTERIOR-COLOR PALETTE/,
  );
  assert.match(
    explorer,
    /open=\{[\s\S]*!yearSource \|\|[\s\S]*yearSourceIsIncompleteSubset \|\|[\s\S]*yearSourceIsReviewedNoChart[\s\S]*\}/,
  );
});

test("invalid and potentially explosive regular expressions fail visibly", async () => {
  const { compileSafeArchivePattern } = await loadSearchModule();
  assert.match(compileSafeArchivePattern("[").error, /Invalid regular expression/);
  assert.match(compileSafeArchivePattern("(a+)+$").error, /Nested or repeated quantifiers/);
  assert.match(compileSafeArchivePattern("(a|aa)+$").error, /Nested or repeated quantifiers/);
  assert.match(compileSafeArchivePattern("/(?=Tahoe)/i").error, /Lookarounds/);
  assert.match(compileSafeArchivePattern("/Tahoe/g").error, /Only the i and m/);
  for (const unsafe of [
    "a*a*b",
    "a*a*a*a*a*a*b",
    `${"a*".repeat(59)}b`,
  ]) {
    const compiled = compileSafeArchivePattern(unsafe);
    assert.match(compiled.error, /Multiple unbounded quantifiers/);
    assert.equal(compiled.regex, null);
  }
  assert.equal(compileSafeArchivePattern("forest.*green").error, null);
  assert.equal(
    compileSafeArchivePattern("forest.*service.*green|14260").error,
    null,
  );
});

test("Tahoe 2000 structured color choices route duplicate colors to each program", async () => {
  const models = await loadArchiveModels();
  const {
    buildArchiveSearchRecords,
    resolveStructuredColorChoice,
    structuredColorChoiceLabel,
  } = await loadSearchModule();
  const options = buildArchiveSearchRecords(models).filter(
    (record) =>
      record.recordKind === "availability" &&
      record.modelId === "tahoe" &&
      record.year === "2000",
  );
  const grouped = new Map();
  for (const record of options) {
    const key = `${record.colorName}\u0000${record.colorCode}`;
    grouped.set(key, [...(grouped.get(key) ?? []), record]);
  }
  const duplicates = [...grouped.values()].find((records) => records.length >= 3);
  assert.ok(duplicates, "Tahoe 2000 must retain a multi-program duplicate color");
  const labels = duplicates.map(structuredColorChoiceLabel);
  assert.equal(new Set(labels).size, duplicates.length);
  for (const [index, label] of labels.entries()) {
    const resolution = resolveStructuredColorChoice(options, label);
    assert.equal(resolution.error, null);
    assert.equal(resolution.record.id, duplicates[index].id);
  }
  const ambiguous = resolveStructuredColorChoice(
    options,
    duplicates[0].colorName,
  );
  assert.equal(ambiguous.record, null);
  assert.match(ambiguous.error, /more than one program/);
});

test("archive explorer exposes ordered structured autosuggest and all-field regex mode", async () => {
  const explorer = await readFile(new URL("app/archive-explorer.tsx", root), "utf8");
  const yearPosition = explorer.indexOf("1 YEAR");
  const modelPosition = explorer.indexOf("2 MODEL");
  const colorPosition = explorer.indexOf("3 COLOR");

  assert.ok(yearPosition >= 0 && yearPosition < modelPosition && modelPosition < colorPosition);
  assert.match(explorer, /<datalist id="archive-year-options">/);
  assert.match(explorer, /<datalist id="archive-model-options">/);
  assert.match(explorer, /<datalist id="archive-color-options">/);
  assert.match(explorer, /ALL FIELDS \/ REGEX/);
  assert.match(explorer, /allFieldSearch\.error/);
  assert.match(explorer, /nearbyYearThumbnails/);
  assert.match(explorer, /buildArchiveMatrix/);
  assert.doesNotMatch(explorer, /Forest Service Green/);
});

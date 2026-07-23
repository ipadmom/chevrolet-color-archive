import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const root = new URL("../", import.meta.url);

async function readJson(relativePath) {
  return JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
}

function expandRanges(ranges) {
  return ranges.flatMap(({ start, end }) =>
    Array.from({ length: end - start + 1 }, (_, index) => start + index),
  );
}

function compressYears(years) {
  const ranges = [];
  for (const year of [...new Set(years)].sort((left, right) => left - right)) {
    const current = ranges.at(-1);
    if (!current || year !== current.end + 1) {
      ranges.push({ start: year, end: year });
    } else {
      current.end = year;
    }
  }
  return ranges;
}

function bandForYear(bands, year) {
  return bands.find((band) => band.start <= year && year <= band.end);
}

function parseTsx(source, fileName) {
  const sourceFile = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  assert.deepEqual(
    sourceFile.parseDiagnostics.map((diagnostic) => diagnostic.messageText),
    [],
    `${fileName} must parse as TSX`,
  );
  return sourceFile;
}

function visit(node, callback) {
  callback(node);
  ts.forEachChild(node, (child) => visit(child, callback));
}

function jsxTagName(node) {
  if (!ts.isJsxOpeningElement(node) && !ts.isJsxSelfClosingElement(node)) {
    return undefined;
  }
  return ts.isIdentifier(node.tagName) ? node.tagName.text : node.tagName.getText();
}

test("platform era bands are sourced, ordered, and bounded by the catalog", async () => {
  const [catalog, platformEras] = await Promise.all([
    readJson("data/catalog/chevrolet-us-nameplates.json"),
    readJson("data/catalog/chevrolet-platform-eras.json"),
  ]);
  const catalogById = new Map(catalog.models.map((model) => [model.id, model]));

  assert.ok(catalog.models.length >= 149, "the comprehensive Chevrolet catalog regressed");
  assert.ok(Object.keys(platformEras).length > 0, "platform era data is empty");

  for (const [modelId, bands] of Object.entries(platformEras)) {
    const model = catalogById.get(modelId);
    assert.ok(model, `${modelId} is not a model in the Chevrolet catalog`);
    assert.ok(Array.isArray(bands) && bands.length > 0, `${modelId} has no era bands`);

    const catalogYears = new Set(expandRanges(model.model_year_ranges));
    let previousEnd = -Infinity;

    for (const band of bands) {
      assert.ok(Number.isInteger(band.start), `${modelId} era start must be an integer`);
      assert.ok(Number.isInteger(band.end), `${modelId} era end must be an integer`);
      assert.ok(band.start <= band.end, `${modelId} has a reversed ${band.start}-${band.end} band`);
      assert.ok(
        band.start > previousEnd,
        `${modelId} era bands overlap or are out of order at ${band.start}`,
      );
      previousEnd = band.end;

      assert.ok(band.label?.trim(), `${modelId} ${band.start}-${band.end} has no label`);
      assert.ok(
        Array.isArray(band.aliases) && band.aliases.length > 0,
        `${modelId} ${band.start}-${band.end} has no aliases`,
      );
      assert.match(
        band.confidence ?? "",
        /^(high|medium|low)$/,
        `${modelId} ${band.start}-${band.end} has no valid confidence`,
      );
      assert.ok(band.notes?.trim(), `${modelId} ${band.start}-${band.end} has no notes`);
      assert.ok(
        Array.isArray(band.evidence_urls) && band.evidence_urls.length > 0,
        `${modelId} ${band.start}-${band.end} has no evidence URL`,
      );
      for (const evidenceUrl of band.evidence_urls) {
        assert.match(
          evidenceUrl,
          /^https:\/\//,
          `${modelId} ${band.start}-${band.end} has an invalid evidence URL`,
        );
      }

      for (let year = band.start; year <= band.end; year += 1) {
        assert.ok(
          catalogYears.has(year),
          `${modelId} era ${band.label} includes non-catalog year ${year}`,
        );
      }
    }
  }
});

test("the exhaustive platform coverage audit reconciles every catalog model and year", async () => {
  const [catalog, platformEras, audit] = await Promise.all([
    readJson("data/catalog/chevrolet-us-nameplates.json"),
    readJson("data/catalog/chevrolet-platform-eras.json"),
    readJson("data/audits/chevrolet-platform-era-coverage.json"),
  ]);

  assert.deepEqual(
    audit.records.map((record) => record.model_id),
    catalog.models.map((model) => model.id),
    "coverage audit must retain every catalog model in catalog order",
  );

  let coveredModelYears = 0;
  let catalogModelYears = 0;
  const statusCounts = { complete: 0, partial: 0, missing: 0 };
  for (const model of catalog.models) {
    const record = audit.records.find((candidate) => candidate.model_id === model.id);
    const catalogYears = new Set(expandRanges(model.model_year_ranges));
    const platformYears = new Set(expandRanges(platformEras[model.id] ?? []));
    const uncoveredYears = [...catalogYears].filter((year) => !platformYears.has(year));
    const expectedStatus =
      uncoveredYears.length === 0
        ? "complete"
        : platformYears.size > 0
          ? "partial"
          : "missing";
    catalogModelYears += catalogYears.size;
    coveredModelYears += platformYears.size;
    statusCounts[expectedStatus] += 1;

    assert.equal(record.model_name, model.name, `${model.id} name drifted`);
    assert.equal(record.vehicle_class, model.vehicle_class, `${model.id} class drifted`);
    assert.deepEqual(record.catalog_year_ranges, model.model_year_ranges.map(({ start, end }) => ({ start, end })));
    assert.equal(record.catalog_year_count, catalogYears.size, `${model.id} catalog count drifted`);
    assert.equal(record.platform_band_count, (platformEras[model.id] ?? []).length, `${model.id} band count drifted`);
    assert.equal(record.platform_year_count, platformYears.size, `${model.id} platform count drifted`);
    assert.equal(record.uncovered_year_count, uncoveredYears.length, `${model.id} gap count drifted`);
    assert.deepEqual(record.uncovered_year_ranges, compressYears(uncoveredYears), `${model.id} gap ranges drifted`);
    assert.equal(record.coverage_status, expectedStatus, `${model.id} status drifted`);
  }

  assert.equal(audit.summary.catalog_model_count, catalog.models.length);
  assert.equal(audit.summary.platform_model_count, Object.keys(platformEras).length);
  assert.equal(audit.summary.platform_band_count, Object.values(platformEras).flat().length);
  assert.equal(audit.summary.catalog_model_year_count, catalogModelYears);
  assert.equal(audit.summary.covered_model_year_count, coveredModelYears);
  assert.equal(
    audit.summary.uncovered_model_year_count,
    catalogModelYears - coveredModelYears,
  );
  assert.equal(audit.summary.complete_model_count, statusCounts.complete);
  assert.equal(audit.summary.partial_model_count, statusCounts.partial);
  assert.equal(audit.summary.missing_model_count, statusCounts.missing);
  assert.deepEqual(audit.validation, {
    invalid_model_id_count: 0,
    invalid_band_count: 0,
    overlap_count: 0,
    out_of_catalog_year_count: 0,
  });
});

test("README and platform audit documentation report the generated coverage totals", async () => {
  const [audit, readme, auditDocument] = await Promise.all([
    readJson("data/audits/chevrolet-platform-era-coverage.json"),
    readFile(new URL("README.md", root), "utf8"),
    readFile(new URL("docs/platform-era-audit.md", root), "utf8"),
  ]);
  const number = new Intl.NumberFormat("en-US").format;
  const { summary } = audit;

  assert.ok(
    readme.includes(
      `${summary.platform_model_count} high-priority nameplates now use ${number(summary.platform_band_count)} sourced base, platform, and era bands`,
    ),
    "README platform model or band count drifted",
  );
  assert.ok(
    readme.includes(
      `covers ${number(summary.covered_model_year_count)}\nof ${number(summary.catalog_model_year_count)} catalog model-years; all ${number(summary.uncovered_model_year_count)} unresolved years`,
    ),
    "README platform coverage count drifted",
  );
  assert.ok(
    auditDocument.includes(
      `maps ${summary.platform_model_count} catalog model IDs to ${number(summary.platform_band_count)} ordered`,
    ),
    "platform audit model or band count drifted",
  );
  assert.ok(
    auditDocument.includes(
      `${number(summary.covered_model_year_count)} of ${number(summary.catalog_model_year_count)} catalog model-years have sourced labels`,
    ),
    "platform audit coverage count drifted",
  );
});

test("long-run platform expansion exposes exact known era labels without hiding the 1992 bus conflict", async () => {
  const platformEras = await readJson("data/catalog/chevrolet-platform-eras.json");
  const expectedLabels = [
    ["p-series-step-van", 1940, "First-generation Dubl-Duti"],
    ["p-series-step-van", 1941, "AK-Series Dubl-Duti"],
    ["p-series-step-van", 1949, "Advance Design Dubl-Duti"],
    ["p-series-step-van", 1955, "Dubl-Duti / forward-control chassis transition"],
    ["p-series-step-van", 1964, "Round-front Step-Van / Step-Van 7 / Step-Van King"],
    ["p-series-step-van", 1982, "Step-Van King / P-Series commercial chassis"],
    ["pre-ck-truck", 1941, "AK Series / Art Deco"],
    ["pre-ck-truck", 1955, "Advance Design First Series / Task Force Second Series"],
    ["b-series-bus-chassis", 1980, "First-generation B60 bus chassis"],
    ["b-series-bus-chassis", 1993, "Third-generation B7 / GMT530 bus chassis"],
    ["panel-truck", 1970, "Action Line panel truck"],
    ["sportvan", 1965, "First-generation G-Series Sportvan"],
    ["sportvan", 1971, "Third-generation G-Series Sportvan"],
    ["sedan-delivery", 1958, "Delray-based sedan delivery"],
    ["bel-air", 1955, "Second generation, Tri-Five"],
    ["tiltmaster-w-series", 2002, "Isuzu N-Series-derived Tiltmaster / W-Series"],
    ["canopy-express", 1931, "Pre-AK Chevrolet truck-series Canopy Express"],
    ["l-series-tilt-cab", 1970, "Chevrolet Tilt Cab"],
    ["l-series-tilt-cab", 1979, "Chevrolet Steel Tilt Cab, W60 / W70"],
  ];

  for (const [modelId, year, label] of expectedLabels) {
    assert.equal(bandForYear(platformEras[modelId], year)?.label, label);
  }
  assert.equal(
    bandForYear(platformEras["b-series-bus-chassis"], 1992),
    undefined,
    "1992 must remain an explicit evidence conflict, not an invented transition band",
  );
});

test("Caprice PPV uses one sourced Zeta and Holden WM-WN band for 2011-2017", async () => {
  const platformEras = await readJson("data/catalog/chevrolet-platform-eras.json");
  const bands = platformEras["caprice-ppv"];

  assert.equal(bands.length, 1);
  assert.deepEqual(
    bands.map(({ start, end }) => [start, end]),
    [[2011, 2017]],
  );
  assert.equal(bandForYear(bands, 2011)?.label, "GM Zeta, Holden WM/WN Caprice PPV era");
  assert.equal(bandForYear(bands, 2017)?.label, "GM Zeta, Holden WM/WN Caprice PPV era");
  assert.ok(bands[0].aliases.includes("GM Zeta"));
  assert.ok(bands[0].aliases.includes("Holden WM"));
  assert.ok(bands[0].aliases.includes("Holden WN"));
});

test("commercial body and cab-over boundaries retain only documented model years and Chevrolet names", async () => {
  const [catalog, platformEras] = await Promise.all([
    readJson("data/catalog/chevrolet-us-nameplates.json"),
    readJson("data/catalog/chevrolet-platform-eras.json"),
  ]);
  const catalogById = new Map(catalog.models.map((model) => [model.id, model]));

  assert.deepEqual(
    platformEras["p-series-step-van"].map(({ start, end }) => [start, end]),
    [[1940, 1940], [1941, 1942], [1946, 1948], [1949, 1954], [1955, 1955], [1956, 1957], [1958, 1960], [1961, 1963], [1964, 1967], [1968, 1981], [1982, 1998]],
  );
  assert.deepEqual(
    platformEras["b-series-bus-chassis"].map(({ start, end }) => [start, end]),
    [[1967, 1979], [1980, 1983], [1984, 1991], [1993, 2003]],
  );
  assert.deepEqual(
    platformEras["bel-air"].map(({ start, end }) => [start, end]),
    [[1950, 1954], [1955, 1957], [1958, 1958], [1959, 1960], [1961, 1964], [1965, 1970], [1971, 1975]],
  );

  assert.deepEqual(catalogById.get("sportvan").model_year_ranges.map(({ start, end }) => [start, end]), [[1965, 1996]]);
  assert.equal(bandForYear(platformEras.sportvan, 1964), undefined);
  assert.equal(bandForYear(platformEras.sportvan, 1996)?.label, "Third-generation G-Series Sportvan");

  assert.deepEqual(catalogById.get("panel-truck").model_year_ranges.map(({ start, end }) => [start, end]), [[1929, 1942], [1946, 1970]]);
  assert.equal(bandForYear(platformEras["panel-truck"], 1970)?.label, "Action Line panel truck");
  assert.equal(bandForYear(platformEras["panel-truck"], 1971), undefined);

  assert.equal(bandForYear(platformEras["canopy-express"], 1930), undefined);
  assert.equal(bandForYear(platformEras["canopy-express"], 1931)?.start, 1931);
  assert.equal(bandForYear(platformEras["sedan-delivery"], 1930), undefined);
  assert.equal(bandForYear(platformEras["sedan-delivery"], 1946)?.label, "Stylemaster-based postwar sedan delivery");

  assert.deepEqual(
    platformEras["l-series-tilt-cab"].map(({ start, end }) => [start, end]),
    [[1960, 1972], [1973, 1978], [1979, 1981]],
  );
  assert.ok(
    platformEras["l-series-tilt-cab"].every((band) => !/L-Series/.test(band.label)),
    "GMC L-Series must not appear as a Chevrolet display label",
  );
  assert.deepEqual(
    platformEras["tiltmaster-w-series"].map(({ start, end }) => [start, end]),
    [[1984, 2009]],
  );
});

test("Tahoe and Suburban era bands cover every catalog year without filling model-year gaps", async () => {
  const [catalog, platformEras] = await Promise.all([
    readJson("data/catalog/chevrolet-us-nameplates.json"),
    readJson("data/catalog/chevrolet-platform-eras.json"),
  ]);
  const catalogById = new Map(catalog.models.map((model) => [model.id, model]));

  for (const modelId of ["tahoe", "suburban"]) {
    const expectedYears = expandRanges(catalogById.get(modelId).model_year_ranges);
    const eraYears = expandRanges(platformEras[modelId]);
    assert.deepEqual(eraYears, expectedYears, `${modelId} era coverage must equal its catalog years`);
  }
});

test("full-size SUV platform labels retain exact GM family and derivative codes", async () => {
  const platformEras = await readJson("data/catalog/chevrolet-platform-eras.json");
  const expectedLabels = [
    ["tahoe", 1995, "GMT400 family, GMT420"],
    ["tahoe", 2001, "GMT800 family, GMT820"],
    ["suburban", 2000, "GMT800 family, GMT830"],
    ["avalanche", 2002, "GMT800 family, GMT805"],
    ["tahoe", 2007, "GMT900 / GMT920 / GMT921"],
    ["suburban", 2007, "GMT900 / GMT930 / GMT931"],
    ["tahoe", 2015, "K2XX / GMTK2UC"],
    ["suburban", 2015, "K2XX / GMTK2YC"],
    ["tahoe", 2021, "T1XX / GMTT1UC"],
    ["suburban", 2021, "T1XX / GMTT1YC"],
  ];

  for (const [modelId, year, expectedLabel] of expectedLabels) {
    assert.equal(
      bandForYear(platformEras[modelId], year)?.label,
      expectedLabel,
      `${modelId} ${year} lost its platform/program label`,
    );
  }
});

test("mixed transition model years remain explicit single-year bands", async () => {
  const platformEras = await readJson("data/catalog/chevrolet-platform-eras.json");
  const transitions = [
    ["suburban", 1955, /Advance Design First Series \/ Task Force Second Series/, /transition|both/i],
    ["tahoe", 2000, /GMT420 carryover \/ GMT820 launch/, /mixed/i],
    ["silverado", 2007, /GMT800 Classic \/ GMT900 launch/, /both|transition/i],
    ["silverado-hd", 2007, /GMT880 Classic \/ GMT910 launch/, /transition/i],
  ];

  for (const [modelId, year, labelPattern, notePattern] of transitions) {
    const band = bandForYear(platformEras[modelId], year);
    assert.ok(band, `${modelId} ${year} transition band is missing`);
    assert.equal(band.start, year, `${modelId} ${year} transition must start in ${year}`);
    assert.equal(band.end, year, `${modelId} ${year} transition must end in ${year}`);
    assert.match(band.label, labelPattern);
    assert.match(band.notes, notePattern);
  }
});

test("vehicle profiles are accessible SVGs with model, body, and era metadata", async () => {
  const source = await readFile(new URL("app/vehicle-profile-svg.tsx", root), "utf8");
  const sourceFile = parseTsx(source, "vehicle-profile-svg.tsx");
  let svgOpening;
  let hasTitle = false;
  let exportedComponent = false;

  visit(sourceFile, (node) => {
    if (jsxTagName(node) === "svg") svgOpening = node;
    if (jsxTagName(node) === "title") hasTitle = true;
    if (
      ts.isFunctionDeclaration(node) &&
      node.name?.text === "VehicleProfileSvg" &&
      node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)
    ) {
      exportedComponent = true;
    }
  });

  assert.ok(exportedComponent, "VehicleProfileSvg must remain an exported component");
  assert.ok(svgOpening, "VehicleProfileSvg must render a real <svg>");
  assert.ok(hasTitle, "VehicleProfileSvg must include an accessible <title>");

  const attributes = new Map(
    svgOpening.attributes.properties
      .filter(ts.isJsxAttribute)
      .map((attribute) => [attribute.name.getText(), attribute.initializer]),
  );
  const expressionName = (attributeName) => {
    const initializer = attributes.get(attributeName);
    return ts.isJsxExpression(initializer) && ts.isIdentifier(initializer.expression)
      ? initializer.expression.text
      : undefined;
  };

  assert.equal(expressionName("data-profile-model"), "modelId");
  assert.equal(expressionName("data-body-kind"), "kind");
  assert.equal(expressionName("data-design-era"), "era");
  assert.ok(attributes.has("role"), "SVG must keep its image role");
  assert.ok(attributes.has("aria-label"), "SVG must keep its accessible label");
});

test("truck profiles use separate pickup, heavy-truck, cab-over, and forward-control geometry", async () => {
  const source = await readFile(new URL("app/vehicle-profile-svg.tsx", root), "utf8");
  const sourceFile = parseTsx(source, "vehicle-profile-svg.tsx");
  const functionNames = new Set();

  visit(sourceFile, (node) => {
    if (ts.isFunctionDeclaration(node) && node.name) {
      functionNames.add(node.name.text);
    }
  });

  for (const functionName of [
    "passengerBodyPath",
    "pickupBodyPath",
    "heavyTruckBodyPath",
    "caboverBodyPath",
    "forwardControlBodyPath",
  ]) {
    assert.ok(functionNames.has(functionName), `${functionName} must remain distinct`);
  }

  assert.match(source, /spec\.kind === "pickup"\) return pickupBodyPath/);
  assert.match(source, /spec\.kind === "heavy-truck"\) return heavyTruckBodyPath/);
  assert.match(source, /spec\.kind === "cabover"\) return caboverBodyPath/);
  assert.match(source, /spec\.kind === "forward-control"\) return forwardControlBodyPath/);
  assert.match(source, /data-cab-style=/);
  assert.match(source, /rear-tandem/);
});

test("truck classification keeps conventional, utility, and forward-control models distinct", async () => {
  const source = await readFile(new URL("app/vehicle-profile-svg.tsx", root), "utf8");

  for (const modelId of ["3600", "3800", "apache"]) {
    assert.match(
      source,
      new RegExp(`modelId === "${modelId}"`),
      `${modelId} must be classified as a pickup`,
    );
  }
  for (const modelId of ["el-camino", "avalanche", "ssr"]) {
    assert.match(
      source,
      new RegExp(`modelId === "${modelId}"`),
      `${modelId} must retain a utility body`,
    );
  }
  for (const modelId of ["rampside", "loadside"]) {
    assert.match(
      source,
      new RegExp(`modelId === "${modelId}"`),
      `${modelId} must retain forward-control architecture`,
    );
  }
  for (const modelId of ["silverado", "silverado-hd", "colorado", "silverado-ev", "s10", "ck-series"]) {
    assert.match(
      source,
      new RegExp(`"${modelId}"|modelId === "${modelId}"`),
      `${modelId} must participate in cab-layout rules`,
    );
  }
});

test("signature Chevrolet models participate in executable SVG design overrides", async () => {
  const source = await readFile(new URL("app/vehicle-profile-svg.tsx", root), "utf8");
  const sourceFile = parseTsx(source, "vehicle-profile-svg.tsx");
  const modelComparisons = new Set();

  visit(sourceFile, (node) => {
    if (!ts.isBinaryExpression(node)) return;
    if (
      node.operatorToken.kind !== ts.SyntaxKind.EqualsEqualsEqualsToken &&
      node.operatorToken.kind !== ts.SyntaxKind.EqualsEqualsToken
    ) {
      return;
    }
    const pairs = [
      [node.left, node.right],
      [node.right, node.left],
    ];
    for (const [candidateIdentifier, candidateValue] of pairs) {
      if (
        ts.isIdentifier(candidateIdentifier) &&
        candidateIdentifier.text === "modelId" &&
        ts.isStringLiteral(candidateValue)
      ) {
        modelComparisons.add(candidateValue.text);
      }
    }
  });

  for (const modelId of [
    "camaro",
    "corvette",
    "tahoe",
    "suburban",
    "avalanche",
    "ssr",
    "caprice-ppv",
  ]) {
    assert.ok(modelComparisons.has(modelId), `${modelId} needs an explicit SVG design override`);
  }
});

test("archive explorer uses SVG profiles and cannot regress to the generic placeholder", async () => {
  const source = await readFile(new URL("app/archive-explorer.tsx", root), "utf8");
  const sourceFile = parseTsx(source, "archive-explorer.tsx");
  let hasProfileImport = false;
  let profileRenderCount = 0;
  const identifiers = new Set();
  const stringLiterals = new Set();

  visit(sourceFile, (node) => {
    if (
      ts.isImportDeclaration(node) &&
      ts.isStringLiteral(node.moduleSpecifier) &&
      node.moduleSpecifier.text === "./vehicle-profile-svg"
    ) {
      hasProfileImport =
        node.importClause?.namedBindings?.elements.some(
          (element) => element.name.text === "VehicleProfileSvg",
        ) ?? false;
    }
    if (jsxTagName(node) === "VehicleProfileSvg") profileRenderCount += 1;
    if (ts.isIdentifier(node)) identifiers.add(node.text);
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      stringLiterals.add(node.text);
    }
  });

  assert.ok(hasProfileImport, "archive explorer must import VehicleProfileSvg");
  assert.ok(profileRenderCount >= 5, "sidebar, model, year, and archive profile surfaces need SVGs");
  assert.equal(
    stringLiterals.has("ia-sidebar-profile"),
    true,
    "the persistent model menu must render compact SVG thumbnails",
  );
  assert.equal(
    stringLiterals.has("ia-sidebar-swatch"),
    false,
    "generic sidebar color swatches must not return",
  );
  assert.equal(identifiers.has("profilePhoto"), false, "photo-backed profile hotlinks must not return");
  assert.equal(identifiers.has("VehicleProfile"), false, "the old placeholder component must not return");

  for (const removedClass of [
    "vehicle-placeholder",
    "vehicle-body",
    "vehicle-window",
    "vehicle-wheel",
    "vehicle-wheel-left",
    "vehicle-wheel-right",
  ]) {
    assert.equal(stringLiterals.has(removedClass), false, `${removedClass} placeholder markup must not return`);
  }
});

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
          /^https?:\/\//,
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

  for (const modelId of ["camaro", "corvette", "tahoe", "suburban", "avalanche", "ssr"]) {
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

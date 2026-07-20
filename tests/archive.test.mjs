import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const root = new URL("../", import.meta.url);

async function loadArchiveData() {
  const source = await readFile(new URL("app/archive-data.ts", root), "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);
}

test("Camaro matrix has the exact reviewed chart counts", async () => {
  const { models } = await loadArchiveData();
  const camaro = models.find((model) => model.id === "camaro");
  const generation = camaro.generations[0];

  assert.deepEqual(generation.years, ["1967", "1968", "1969"]);
  assert.equal(generation.colors.length, 45);
  assert.equal(generation.listingCount, 48);
  assert.equal(generation.colors.filter((color) => color.availability["1967"]).length, 15);
  assert.equal(generation.colors.filter((color) => color.availability["1968"]).length, 15);
  assert.equal(generation.colors.filter((color) => color.availability["1969"]).length, 18);
});

test("Camaro chart codes, family rows, and restrictions are preserved", async () => {
  const { models } = await loadArchiveData();
  const colors = models[0].generations[0].colors;
  const color = (id) => colors.find((entry) => entry.id === id);

  assert.equal(color("hugger-orange").availability["1969"].code, "72");
  assert.equal(color("rally-green-family").availability["1968"].code, "JJ");
  assert.equal(color("rally-green-family").availability["1969"].code, "79");
  assert.equal(color("lemans-blue-family").availability["1968"].label, "LeMans Blue");
  assert.equal(color("lemans-blue-family").availability["1969"].label, "Le Mans Blue");
  assert.equal(color("butternut-yellow").availability["1968"].code, "YY");
  assert.equal(color("butternut-yellow").availability["1969"].code, "40");
  assert.equal(
    color("tuxedo-black-1969").availability["1969"].restriction,
    "Los Angeles special order; Norwood regular",
  );
  assert.equal(
    color("champagne-1969").availability["1969"].restriction,
    "Norwood special order",
  );
  assert.equal(
    colors.filter((entry) => entry.availability["1969"]?.state === "restricted").length,
    6,
  );
});

test("every published year links to a precise official GM source", async () => {
  const { models } = await loadArchiveData();
  const sources = models[0].generations[0].sources;

  for (const year of ["1967", "1968", "1969"]) {
    assert.match(sources[year].url, /^https:\/\/www\.gm\.com\/.*\.pdf$/);
    assert.match(sources[year].locator, /PDF p\./);
    assert.ok(sources[year].revision);
  }
});

test("C1 Corvette tables preserve source qualifications, codes, and counts", async () => {
  const { models } = await loadArchiveData();
  const corvette = models.find((model) => model.id === "corvette");
  const generation = corvette.generations[0];
  const color = (id) =>
    generation.colors.find((entry) => entry.id === id);

  assert.deepEqual(generation.years, [
    "1954",
    "1955",
    "1956",
    "1957",
    "1958",
    "1959",
    "1960",
    "1961",
    "1962",
  ]);
  assert.equal(generation.colors.length, 35);
  assert.equal(generation.listingCount, 58);
  assert.deepEqual(
    Object.fromEntries(
      generation.years.map((year) => [
        year,
        generation.colors.filter((entry) => entry.availability[year]).length,
      ]),
    ),
    {
      "1954": 4,
      "1955": 5,
      "1956": 6,
      "1957": 6,
      "1958": 8,
      "1959": 7,
      "1960": 8,
      "1961": 7,
      "1962": 7,
    },
  );
  const expectedLabels = {
    "1957": [
      "Onyx Black",
      "Aztec Copper",
      "Cascade Green",
      "Arctic Blue",
      "Venetian Red",
      "Polo White",
    ],
    "1958": [
      "Charcoal",
      "Snowcrest White",
      "Silver Blue",
      "Regal Turquoise",
      "Panama Yellow",
      "Signet Red",
      "Black",
      "Silver",
    ],
    "1959": [
      "Tuxedo Black",
      "Classic Cream",
      "Frost Blue",
      "Crown Sapphire",
      "Roman Red",
      "Snowcrest White",
      "Inca Silver",
    ],
    "1960": [
      "Tuxedo Black",
      "Tasco Turquoise",
      "Horizon Blue",
      "Honduras Maroon",
      "Roman Red",
      "Ermine White",
      "Sateen Silver",
      "Cascade Green",
    ],
    "1961": [
      "Tuxedo Black",
      "Ermine White",
      "Roman Red",
      "Sateen Silver",
      "Jewel Blue",
      "Fawn Beige",
      "Honduras Maroon",
    ],
    "1962": [
      "Tuxedo Black",
      "Fawn Beige",
      "Roman Red",
      "Ermine White",
      "Almond Beige",
      "Sateen Silver",
      "Honduras Maroon",
    ],
  };
  for (const [year, labels] of Object.entries(expectedLabels)) {
    assert.deepEqual(
      generation.colors
        .map((entry) => entry.availability[year]?.label)
        .filter(Boolean)
        .sort(),
      labels.sort(),
    );
  }
  assert.equal(
    generation.colors
      .flatMap((entry) =>
        ["1954", "1955"]
          .map((year) => entry.availability[year])
          .filter(Boolean),
      )
      .every(
        (availability) => availability.state === "restricted",
      ),
    true,
  );
  for (const year of ["1956", "1957", "1958", "1960", "1961", "1962"]) {
    assert.ok(
      generation.colors
        .map((entry) => entry.availability[year])
        .filter(Boolean)
        .every((availability) => availability.state === "listed"),
    );
  }
  assert.ok(
    generation.colors
      .map((entry) => entry.availability["1959"])
      .filter(Boolean)
      .every((availability) => availability.state === "restricted"),
  );
  assert.equal(
    color("corvette-polo-white-early").availability["1955"].code,
    "567",
  );
  assert.equal(
    color("corvette-harvest-gold-1955").availability["1955"].code,
    "632",
  );
  assert.equal(
    color("corvette-venetian-red-1956").availability["1956"].code,
    "not stated",
  );
  assert.equal(
    color("corvette-venetian-red-1956").availability["1957"].state,
    "listed",
  );
  assert.equal(
    color("corvette-snowcrest-white").availability["1959"].state,
    "restricted",
  );
  assert.equal(
    color("corvette-tuxedo-black-1959").availability["1962"].state,
    "listed",
  );
  assert.equal(
    color("corvette-cascade-green-1956").availability["1960"],
    undefined,
  );
  assert.equal(
    color("corvette-cascade-green-1960").availability["1960"].state,
    "listed",
  );
  assert.match(
    color("corvette-cascade-green-1960").note,
    /metallic paint distinct/,
  );
  assert.equal(
    generation.colors.some((entry) =>
      /Royal Heather|Amethyst|Tangier/i.test(entry.name),
    ),
    false,
  );
  assert.match(generation.revisionNote, /1953 remains unverified/);

  for (const year of generation.years) {
    assert.match(
      generation.sources[year].url,
      new RegExp(`${year}-Chevrolet-Corvette\\.pdf$`),
    );
    assert.match(generation.sources[year].locator, /PDF p\./);
    assert.ok(generation.sources[year].revision);
  }

  const exactPrimaryLocators = {
    1957: "PDF p. 33, printed CORVETTE SUPPLEMENT - 67",
    1958: "PDF p. 12, printed CORVETTE SUPPLEMENT - P49",
    1959: "PDF p. 5, printed p. 33",
    1960: "PDF p. 6, printed CORVETTE-5",
    1961: "PDF p. 12, printed CORVETTE-5",
    1962: "PDF p. 14, printed CORVETTE-5",
  };
  for (const [year, locator] of Object.entries(exactPrimaryLocators)) {
    assert.equal(generation.sources[year].locator, locator);
  }
});

test("Corvette quantity audit reconciles the qualified production tables", async () => {
  const audit = await readFile(
    new URL("docs/source-audit-early-corvette.md", root),
    "utf8",
  );

  function numericQuantities(year) {
    const heading = `## ${year}`;
    const start = audit.indexOf(heading);
    assert.notEqual(start, -1, `missing ${year} audit section`);
    const next = audit.indexOf("\n## ", start + heading.length);
    const section = audit.slice(start, next === -1 ? undefined : next);
    return [...section.matchAll(/^\| [^|\r\n]+ \| [^|\r\n]+ \| ([\d,]+) \|\r?$/gm)]
      .map((match) => Number.parseInt(match[1].replaceAll(",", ""), 10));
  }

  const reconciliations = {
    1958: { count: 8, total: 9164 },
    1959: { count: 7, total: 9582 },
    1960: { count: 8, total: 10246 },
    1961: { count: 7, total: 10922 },
    1962: { count: 2, total: 2671 },
  };
  for (const [year, expected] of Object.entries(reconciliations)) {
    const quantities = numericQuantities(year);
    assert.equal(quantities.length, expected.count);
    assert.equal(
      quantities.reduce((total, quantity) => total + quantity, 0),
      expected.total,
    );
  }

  assert.match(audit, /9,164[\s\S]*9,168 production/);
  assert.match(audit, /9,582[\s\S]*9,670 production/);
  assert.match(audit, /10,246[\s\S]*10,261 production/);
  assert.match(audit, /10,922[\s\S]*10,939 production/);
  assert.match(audit, /Royal Heather Amethyst[\s\S]*unverified candidate/);
});

test("production shell replaces the disposable starter", async () => {
  const [page, layout, explorer, packageJson] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/layout.tsx", root), "utf8"),
    readFile(new URL("app/archive-explorer.tsx", root), "utf8"),
    readFile(new URL("package.json", root), "utf8"),
  ]);

  assert.match(page, /ArchiveExplorer/);
  assert.match(layout, /Chevrolet Color Archive/);
  assert.match(explorer, /Choose a model/);
  assert.match(explorer, /Choose a year/);
  assert.match(explorer, /color timeline/);
  assert.match(explorer, /Claim-level evidence/);
  assert.match(explorer, /Stage photograph/);
  assert.match(explorer, /model\.generations\.flatMap/);
  assert.match(explorer, /item\.years\.includes\(year\)/);
  assert.match(explorer, /archiveListingCount/);
  assert.doesNotMatch(explorer, /<strong>48<\/strong>/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  await assert.rejects(access(new URL("app/_sites-preview/SkeletonPreview.tsx", root)));
});

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
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  await assert.rejects(access(new URL("app/_sites-preview/SkeletonPreview.tsx", root)));
});

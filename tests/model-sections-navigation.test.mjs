import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, root), "utf8"));
}

function finalModelYear(model) {
  return Math.max(...model.model_year_ranges.map((range) => range.end));
}

function bucketId(model) {
  if (model.current) return "current";
  const finalYear = finalModelYear(model);
  if (finalYear >= 2000) return "discontinued-2000-plus";
  if (finalYear >= 1990) return "discontinued-1990s";
  if (finalYear >= 1970) return "discontinued-1970s-1980s";
  return "discontinued-before-1970";
}

test("all nameplates belong to exactly one ordered current or discontinued section", async () => {
  const catalog = await readJson("data/catalog/chevrolet-us-nameplates.json");
  const sections = new Map([
    ["current", []],
    ["discontinued-2000-plus", []],
    ["discontinued-1990s", []],
    ["discontinued-1970s-1980s", []],
    ["discontinued-before-1970", []],
  ]);

  for (const model of catalog.models) sections.get(bucketId(model)).push(model.id);

  assert.deepEqual(
    [...sections.values()].map((items) => items.length),
    [18, 41, 10, 28, 52],
  );
  const assigned = [...sections.values()].flat();
  assert.equal(assigned.length, catalog.models.length);
  assert.equal(new Set(assigned).size, catalog.models.length);
  assert.ok(sections.get("current").includes("tahoe"));
  assert.ok(sections.get("current").includes("suburban"));
  assert.ok(sections.get("discontinued-2000-plus").includes("camaro"));
  assert.ok(sections.get("discontinued-1990s").includes("celebrity"));
  assert.ok(sections.get("discontinued-1970s-1980s").includes("panel-truck"));
  assert.ok(sections.get("discontinued-before-1970").includes("corvair"));
});

test("the model index and left rail render the same five sections", async () => {
  const explorer = await readFile(
    new URL("app/archive-explorer.tsx", root),
    "utf8",
  );
  const labels = [
    "CURRENT MODELS",
    "DISCONTINUED 2000 OR LATER",
    "DISCONTINUED 1990–1999",
    "DISCONTINUED 1970–1989",
    "DISCONTINUED BEFORE 1970",
  ];

  let previousIndex = -1;
  for (const label of labels) {
    const index = explorer.indexOf(`label: "${label}"`);
    assert.ok(index > previousIndex, `${label} is missing or out of order`);
    previousIndex = index;
  }
  assert.equal(explorer.match(/modelSections\.map/g)?.length, 2);
  assert.doesNotMatch(explorer, />ALL MODELS</);
});

test("archive navigation creates history entries and restores them on Back", async () => {
  const explorer = await readFile(
    new URL("app/archive-explorer.tsx", root),
    "utf8",
  );

  assert.match(explorer, /window\.history\.pushState/);
  assert.doesNotMatch(explorer, /window\.history\.replaceState/);
  assert.match(explorer, /addEventListener\("popstate",\s*syncRouteFromLocation\)/);
  assert.match(explorer, /addEventListener\("hashchange",\s*syncRouteFromLocation\)/);
  assert.match(explorer, /if \(!requestedModel\) \{[\s\S]*?setView\("models"\)/);
});

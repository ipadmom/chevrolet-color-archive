import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const root = new URL("../", import.meta.url);

async function loadThumbnailColorModule() {
  const source = await readFile(
    new URL("app/model-thumbnail-color.ts", root),
    "utf8",
  );
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: "model-thumbnail-color.ts",
  }).outputText;
  return import(
    `data:text/javascript;base64,${Buffer.from(output).toString("base64")}`
  );
}

function color(id, swatch, years) {
  return {
    id,
    swatch,
    availability: Object.fromEntries(years.map((year) => [year, {}])),
  };
}

function model(id, generations) {
  return {
    id,
    generations,
  };
}

test("model thumbnail paint is stable and comes from the latest model year with data", async () => {
  const { modelThumbnailPaint } = await loadThumbnailColorModule();
  const original = model("test-model", [
    {
      years: ["1969"],
      colors: [color("old-red", "#990000", ["1969"])],
    },
    {
      years: ["2024"],
      colors: [
        color("latest-blue", "#0044aa", ["2024"]),
        color("latest-green", "#14733b", ["2024"]),
      ],
    },
  ]);
  const reordered = model("test-model", [
    {
      years: ["2024"],
      colors: [
        color("latest-green", "#14733b", ["2024"]),
        color("latest-blue", "#0044aa", ["2024"]),
      ],
    },
    {
      years: ["1969"],
      colors: [color("old-red", "#990000", ["1969"])],
    },
  ]);

  const selected = modelThumbnailPaint(original);
  assert.equal(selected.year, "2024");
  assert.ok(["#0044aa", "#14733b"].includes(selected.swatch));
  assert.notEqual(selected.swatch, "#990000");
  assert.deepEqual(modelThumbnailPaint(original), selected);
  assert.deepEqual(modelThumbnailPaint(reordered), selected);
});

test("latest palettes union simultaneous programs, reject unrelated years, and deduplicate swatches", async () => {
  const { latestThumbnailPalette } = await loadThumbnailColorModule();
  const palette = latestThumbnailPalette([
    model("union-model", [
      {
        years: ["2026"],
        colors: [
          color("black-a", "#111111", ["2026"]),
          color("unrelated", "#ff00ff", ["2027"]),
        ],
      },
      {
        years: ["2026"],
        colors: [
          color("black-b", "#111111", ["2026"]),
          color("white", "#f4f1e8", ["2026"]),
        ],
      },
    ]),
  ]);

  assert.equal(palette.year, "2026");
  assert.deepEqual(
    palette.colors.map(({ swatch }) => swatch),
    ["#111111", "#f4f1e8"],
  );
});

test("models without color rows use varied authentic archive fallbacks", async () => {
  const { modelThumbnailPaint } = await loadThumbnailColorModule();
  const noDataModel = model("research-queue-model", [
    { years: ["1955"], colors: [] },
  ]);
  const archivePalette = {
    year: "2026",
    colors: [
      { colorId: "black", swatch: "#111111" },
      { colorId: "blue", swatch: "#17458b" },
      { colorId: "green", swatch: "#1f6b45" },
    ],
  };

  const selected = modelThumbnailPaint(noDataModel, archivePalette);
  assert.equal(selected.year, "2026");
  assert.ok(archivePalette.colors.some(({ swatch }) => swatch === selected.swatch));
  assert.deepEqual(modelThumbnailPaint(noDataModel, archivePalette), selected);
  assert.equal(modelThumbnailPaint(noDataModel).swatch, "var(--ia-gold)");
});

test("the explorer uses the shared pseudorandom palette only for model thumbnails", async () => {
  const [helper, explorer] = await Promise.all([
    readFile(new URL("app/model-thumbnail-color.ts", root), "utf8"),
    readFile(new URL("app/archive-explorer.tsx", root), "utf8"),
  ]);

  assert.doesNotMatch(helper, /Math\.random/);
  assert.match(explorer, /latestThumbnailPalette\(models\)/);
  assert.match(
    explorer,
    /modelThumbnailPaint\(model,\s*archiveThumbnailPalette\)\.swatch/,
  );
  assert.match(explorer, /generationAccent\(profileGeneration,\s*itemYear\)/);
  assert.match(explorer, /accent=\{selectedColor\?\.swatch\}/);
});

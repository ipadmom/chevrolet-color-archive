import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function text(path) {
  return readFile(new URL(path, root), "utf8");
}

test("the archive UI keeps the Chevrolet gold, cream, and charcoal palette", async () => {
  const [css, explorer, vehicleProfile, docsIndex, docs404, favicon] =
    await Promise.all([
      text("app/globals.css"),
      text("app/archive-explorer.tsx"),
      text("app/vehicle-profile-svg.tsx"),
      text("docs/index.html"),
      text("docs/404.html"),
      text("public/favicon.svg"),
    ]);
  const uiSources = [
    css,
    explorer,
    vehicleProfile,
    docsIndex,
    docs404,
    favicon,
  ].join("\n");
  const expectedCore = {
    "--ia-charcoal": "#262626",
    "--ia-gold": "#cd9834",
    "--ia-gold-dark": "#b5862d",
    "--ia-cream": "#fbf7ef",
    "--ia-parchment": "#f3e7c0",
    "--ia-border": "#9c8254",
  };

  for (const [token, value] of Object.entries(expectedCore)) {
    assert.match(
      css,
      new RegExp(`${token}:\\s*${value}\\b`, "i"),
      `${token} must retain its warm archive value`,
    );
  }

  assert.doesNotMatch(
    uiSources,
    /#(?:596270|737f95|535c6e|444d5e|444b5c|98a3b9|e4e7ec|1d5f99)\b/i,
  );

  for (const match of uiSources.matchAll(/#([0-9a-f]{6})\b/gi)) {
    const [red, , blue] = match[1]
      .match(/.{2}/g)
      .map((component) => Number.parseInt(component, 16));
    assert.ok(red >= blue, `${match[0]} reintroduces a cool UI literal`);
  }

  for (const match of uiSources.matchAll(
    /rgb\(\s*(\d+)\s+(\d+)\s+(\d+)(?:\s*\/[^)]*)?\)/gi,
  )) {
    assert.ok(
      Number(match[1]) >= Number(match[3]),
      `${match[0]} reintroduces a cool UI literal`,
    );
  }

  assert.match(
    css,
    /\.ia-topbar\s*\{[^}]*background:\s*var\(--ia-charcoal\);[^}]*border-bottom:\s*3px solid var\(--ia-gold\);/s,
  );
  assert.match(
    css,
    /\.pageheader\s*\{[^}]*background:[^;]*var\(--ia-gold\)[^;]*;[^}]*color:\s*var\(--ia-charcoal\);/s,
  );
  assert.match(
    css,
    /\.archive-structured-search\s*>\s*button\s*\{[^}]*background:[^;]*var\(--ia-gold\)[^;]*;[^}]*color:\s*var\(--ia-charcoal\);/s,
  );
  assert.match(vehicleProfile, /accent = "var\(--ia-gold\)"/);
  assert.match(explorer, /accent=\{selectedColor\?\.swatch\}/);
  assert.match(explorer, /:\s*"var\(--ia-gold\)"/);
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), "utf8");
}

test("the interface uses the Chevrolet gold and warm-neutral token set", async () => {
  const styles = await source("app/globals.css");
  const expectedCore = {
    "--ia-charcoal": "#262626",
    "--ia-gold": "#cd9834",
    "--ia-gold-dark": "#b5862d",
    "--ia-cream": "#fbf7ef",
    "--ia-parchment": "#f3e7c0",
    "--ia-border": "#9c8254",
  };

  for (const [token, value] of Object.entries(expectedCore)) {
    assert.match(styles, new RegExp(`${token}:\\s*${value}`, "i"));
  }

  assert.match(
    styles,
    /\.ia-topbar[\s\S]*?background:\s*var\(--ia-charcoal\)[\s\S]*?border-bottom:\s*3px solid var\(--ia-gold\)/,
  );
  assert.match(
    styles,
    /\.pageheader[\s\S]*?background:\s*linear-gradient\([^;]+var\(--ia-gold\)\)[\s\S]*?color:\s*var\(--ia-charcoal\)/,
  );
});

test("theme-owned surfaces do not reintroduce a cool blue shell", async () => {
  const paths = [
    "app/globals.css",
    "app/archive-explorer.tsx",
    "app/vehicle-profile-svg.tsx",
    "docs/index.html",
    "docs/404.html",
    "public/favicon.svg",
  ];
  const sources = await Promise.all(paths.map(source));
  const joined = sources.join("\n");

  assert.doesNotMatch(
    joined,
    /#(?:596270|737f95|535c6e|444d5e|444b5c|98a3b9|e4e7ec|1d5f99)\b/i,
  );

  for (const [index, text] of sources.entries()) {
    for (const match of text.matchAll(/#([0-9a-f]{6})\b/gi)) {
      const value = match[1];
      const red = Number.parseInt(value.slice(0, 2), 16);
      const blue = Number.parseInt(value.slice(4, 6), 16);
      assert.ok(
        red >= blue,
        `${paths[index]} contains a cool UI literal #${value}`,
      );
    }
  }
});

test("vehicle profiles keep real paint accents and use gold only as fallback", async () => {
  const [explorer, profile] = await Promise.all([
    source("app/archive-explorer.tsx"),
    source("app/vehicle-profile-svg.tsx"),
  ]);

  assert.match(profile, /accent\s*=\s*"var\(--ia-gold\)"/);
  assert.match(explorer, /firstColor\?\.swatch\s*\?\?\s*"var\(--ia-gold\)"/);
  assert.match(explorer, /accent=\{selectedColor\?\.swatch\}/);
  assert.match(explorer, /background:\s*selectedColor\.swatch/);
});

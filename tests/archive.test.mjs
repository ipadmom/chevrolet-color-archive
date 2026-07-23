import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const root = new URL("../", import.meta.url);

async function loadArchiveData() {
  const [
    archiveSource,
    catalogSource,
    platformEraSource,
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
      `const platformEraData = ${platformEraSource};\n`,
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
  return import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);
}

async function loadReleasePhotoData() {
  const [moduleSource, manifestSource] = await Promise.all([
    readFile(new URL("app/release-photo-data.ts", root), "utf8"),
    readFile(new URL("data/photos/commons-release-manifest.json", root), "utf8"),
  ]);
  const manifest = JSON.parse(manifestSource);
  const source = moduleSource.replace(
    /^import commonsManifest from "\.\.\/data\/photos\/commons-release-manifest\.json";\r?\n/m,
    `const commonsManifest = ${manifestSource};\n`,
  );
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const photoData = await import(
    `data:text/javascript;base64,${Buffer.from(output).toString("base64")}`
  );
  return { manifest, moduleSource, photoData };
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

test("Camaro second generation preserves complete charts and generation order", async () => {
  const { models } = await loadArchiveData();
  const camaro = models.find((model) => model.id === "camaro");
  const generation = camaro.generations[1];

  assert.deepEqual(
    camaro.generations.map((item) => item.range),
    [
      "1967–1969",
      "1970–1981",
      "1982–1992",
      "1993–2002",
      "2010–2015",
      "2016–2024",
    ],
  );
  assert.deepEqual(generation.years, [
    "1970",
    "1971",
    "1972",
    "1973",
    "1974",
    "1975",
    "1976",
    "1977",
    "1978",
    "1979",
    "1980",
    "1981",
  ]);
  assert.equal(generation.listingCount, 175);
  assert.equal(generation.colors.length, 103);
  assert.deepEqual(
    Object.fromEntries(
      generation.years.map((year) => [
        year,
        generation.colors.filter((color) => color.availability[year]).length,
      ]),
    ),
    {
      1970: 15,
      1971: 15,
      1972: 15,
      1973: 16,
      1974: 16,
      1975: 16,
      1976: 14,
      1977: 14,
      1978: 13,
      1979: 14,
      1980: 14,
      1981: 13,
    },
  );
  assert.equal(
    generation.colors
      .flatMap((color) => Object.values(color.availability))
      .filter((availability) => availability.state === "restricted").length,
    1,
  );
});

test("Camaro 1970–1975 names, exclusions, and source locators stay literal", async () => {
  const { models } = await loadArchiveData();
  const generation = models.find((model) => model.id === "camaro").generations[1];
  const color = (id) =>
    generation.colors.find((entry) => entry.id === id);

  assert.deepEqual(
    Object.keys(
      color("camaro-second-generation-antique-white-1971").availability,
    ),
    ["1971", "1972", "1973", "1974", "1976", "1977"],
  );
  assert.equal(
    color("camaro-second-generation-cream-beige-1974").name,
    "Cream Beige",
  );
  assert.equal(
    color("camaro-second-generation-cream-beige-1975").name,
    "Cream-Beige",
  );
  assert.equal(
    generation.colors.some(
      (entry) =>
        entry.availability["1972"] && /black/i.test(entry.availability["1972"].label),
    ),
    false,
  );
  assert.equal(
    color("camaro-second-generation-persimmon-metallic-1975").availability["1975"].code,
    "64",
  );
  assert.equal(
    color("camaro-second-generation-antique-white-1971").availability["1973"].label,
    "Antique White C/O",
  );
  assert.equal(
    color("camaro-second-generation-antique-white-1971").availability["1972"].label,
    "Antique White",
  );
  assert.equal(
    color("camaro-second-generation-medium-dark-green-metallic-1974").availability["1974"].label,
    "Med. Dark Green Metallic",
  );
  assert.equal(
    color("camaro-second-generation-dark-sandstone-metallic-1975").availability["1975"].label,
    "Dark Sandstone Met.",
  );
  assert.equal(
    color("camaro-second-generation-persimmon-metallic-1975").availability["1975"].label,
    "Persimmon Met.",
  );
  assert.equal(
    color("camaro-second-generation-red-1975").availability["1975"].label,
    "Red C/O",
  );

  const exactLocators = {
    1970: "PDF p. 17, printed BODY-3",
    1971: "PDF p. 48, printed BODY-3",
    1972: "PDF pp. 25–26, printed BODY-3 and 4-BODY",
    1973: "PDF pp. 30–31, printed 4-BODY and BODY-5",
    1974: "PDF pp. 49–50, printed 4-BODY and BODY-5",
    1975: "PDF pp. 22–23, printed 4-BODY and BODY-5",
  };
  for (const [year, locator] of Object.entries(exactLocators)) {
    assert.equal(generation.sources[year].locator, locator);
    assert.match(
      generation.sources[year].url,
      new RegExp(`${year}-Chevrolet-Camaro\\.pdf$`),
    );
  }

  const audit = await readFile(
    new URL("docs/source-audit-camaro-1970-1975.md", root),
    "utf8",
  );

  function documentedCamaroRows(year) {
    const start = audit.indexOf(`## ${year}`);
    assert.notEqual(start, -1, `missing ${year} audit section`);
    const next = audit.indexOf("\n## ", start + 4);
    const section = audit.slice(start, next === -1 ? undefined : next);
    return [...section.matchAll(/^\| (\d+) \| ([^|\r\n]+) \|\r?$/gm)]
      .map((match) => [match[1], match[2].trim(), "listed"])
      .sort((left, right) => left.join("\0").localeCompare(right.join("\0")));
  }

  for (const year of ["1970", "1971", "1972", "1973", "1974", "1975"]) {
    const actual = generation.colors
      .filter((entry) => entry.availability[year])
      .map((entry) => [
        entry.availability[year].code,
        entry.availability[year].label,
        entry.availability[year].state,
      ])
      .sort((left, right) => left.join("\0").localeCompare(right.join("\0")));
    assert.deepEqual(actual, documentedCamaroRows(year));
  }
  assert.equal(
    new Set(generation.colors.map((entry) => entry.id)).size,
    generation.colors.length,
  );

  assert.match(audit, /Neither complete chart lists[\r\n]+black/);
  assert.match(
    audit,
    /Canonical rows preserve[\s\S]*1975 `White`,[\r\n]+`Cream-Beige`, and `Persimmon Metallic`/,
  );
  assert.match(audit, /two-tone paint is unavailable/);
});

test("Camaro 1976–1981 rows, restriction, and source labels match the audit", async () => {
  const { models } = await loadArchiveData();
  const generation = models.find((model) => model.id === "camaro").generations[1];
  const years = ["1976", "1977", "1978", "1979", "1980", "1981"];

  const exactLocators = {
    1976: "PDF p. 72, printed Camaro Page 4",
    1977: "PDF p. 6, printed Camaro Page 4",
    1978: "PDF pp. 30 and 34, printed Camaro Pages 2 and 6",
    1979: "PDF p. 62, printed Camaro Page 6",
    1980: "PDF p. 110, printed Camaro Page 6",
    1981: "PDF p. 44, printed Camaro Page 6",
  };
  for (const [year, locator] of Object.entries(exactLocators)) {
    assert.equal(generation.sources[year].locator, locator);
    assert.match(
      generation.sources[year].url,
      new RegExp(`${year}-Chevrolet-Camaro\\.pdf$`),
    );
  }

  const audit = await readFile(
    new URL("docs/source-audit-camaro-1976-1981.md", root),
    "utf8",
  );

  function documentedCamaroRows(year) {
    const start = audit.indexOf(`## ${year}`);
    assert.notEqual(start, -1, `missing ${year} audit section`);
    const next = audit.indexOf("\n## ", start + 4);
    const section = audit.slice(start, next === -1 ? undefined : next);
    return [
      ...section.matchAll(
        /^\| (\d+) \| ([^|\r\n]+) \| (listed|restricted) \|\s*([^|\r\n]*?)\s*\|\r?$/gm,
      ),
    ]
      .map((match) => [
        match[1],
        match[2].trim(),
        match[3],
        match[4].trim(),
      ])
      .sort((left, right) => left.join("\0").localeCompare(right.join("\0")));
  }

  for (const year of years) {
    const actual = generation.colors
      .filter((entry) => entry.availability[year])
      .map((entry) => [
        entry.availability[year].code,
        entry.availability[year].label,
        entry.availability[year].state,
        entry.availability[year].restriction ?? "",
      ])
      .sort((left, right) => left.join("\0").localeCompare(right.join("\0")));
    assert.deepEqual(actual, documentedCamaroRows(year));
  }

  const restricted = generation.colors.flatMap((entry) =>
    years
      .map((year) => ({ year, color: entry, value: entry.availability[year] }))
      .filter(({ value }) => value?.state === "restricted"),
  );
  assert.equal(restricted.length, 1);
  assert.equal(restricted[0].year, "1978");
  assert.equal(restricted[0].value.code, "34");
  assert.equal(restricted[0].value.label, "Yellow, Orange");
  assert.equal(restricted[0].value.restriction, "Z28 only");

  const brightBlue = generation.colors.find(
    (entry) => entry.name === "Bright Blue Metallic",
  );
  assert.equal(brightBlue.availability["1980"].label, "Blue, Bright (Met)");
  assert.equal(
    brightBlue.availability["1981"].label,
    "Blue, Bright (Metallic)",
  );
  assert.deepEqual(
    Object.keys(
      generation.colors.find((entry) => entry.name === "Antique White")
        .availability,
    ),
    ["1971", "1972", "1973", "1974", "1976", "1977"],
  );

  assert.match(audit, /82 year-specific chart listings/);
  assert.match(audit, /Z85 applications, stripe systems, and Z28 scheme labels/);
  assert.match(audit, /A shared paint code does not merge/);
});

test("Camaro 1982–1992 rows, package restrictions, and source conflicts match the audit", async () => {
  const { models } = await loadArchiveData();
  const generation = models.find((model) => model.id === "camaro").generations[2];
  const years = [
    "1982",
    "1983",
    "1984",
    "1985",
    "1986",
    "1987",
    "1988",
    "1989",
    "1990",
    "1991",
    "1992",
  ];

  assert.deepEqual(generation.years, years);
  assert.equal(generation.listingCount, 108);
  assert.equal(generation.colors.length, 32);
  assert.deepEqual(
    Object.fromEntries(
      years.map((year) => [
        year,
        generation.colors.filter((entry) => entry.availability[year]).length,
      ]),
    ),
    {
      1982: 12,
      1983: 11,
      1984: 11,
      1985: 12,
      1986: 12,
      1987: 10,
      1988: 9,
      1989: 7,
      1990: 7,
      1991: 8,
      1992: 9,
    },
  );
  assert.equal(
    generation.colors
      .flatMap((entry) => Object.values(entry.availability))
      .filter((availability) => availability.state === "restricted").length,
    47,
  );
  assert.equal(
    generation.colors.every((entry) =>
      entry.id.startsWith("camaro-third-generation-"),
    ),
    true,
  );
  assert.equal(
    new Set(generation.colors.map((entry) => entry.id)).size,
    generation.colors.length,
  );

  const exactLocators = {
    1982: "PDF pp. 33, 36, and 38; printed Camaro Dealer Order Guide Pages 2 and 4",
    1983: "PDF pp. 36, 38, and 40, printed Camaro Pages 2, 4, and 6",
    1984:
      "PDF pp. 8, 10, 12, and 15; printed Camaro Pages 2, 4, and 6 plus Exterior Colors overview",
    1985:
      "PDF pp. 30, 34, 36, 38, and 40; printed Camaro/26 and Dealer Order Guide Pages 2, 4, 6, and 8",
    1986:
      "PDF pp. 31–34, 40, 42, and 44; printed Camaro/21–22 and Dealer Order Guide Pages 2, 4, and 6",
    1987:
      "PDF pp. 45 and 17, printed Camaro/23 and unnumbered California RS chart",
    1988:
      "PDF pp. 34, 36, 38, and 40, printed Camaro Pages 2, 4, 6, and 8",
    1989:
      "PDF pp. 34, 38, 40, and 42, printed Camaro Pages 2, 6, 8, and 10",
    1990:
      "PDF pp. 36, 38, 40, and 42, printed Camaro Pages 2, 4, 6, and 8",
    1991:
      "PDF pp. 26, 28, 30, and 32, printed Camaro Pages 2, 4, 6, and 8",
    1992:
      "PDF pp. 84, 86, 88, and 90, printed Camaro Pages 2, 4, 6, and 8",
  };
  for (const [year, locator] of Object.entries(exactLocators)) {
    assert.equal(generation.sources[year].locator, locator);
    assert.match(
      generation.sources[year].url,
      new RegExp(`${year}-Chevrolet-Camaro\\.pdf$`),
    );
  }

  const audit = await readFile(
    new URL("docs/source-audit-camaro-1982-1992.md", root),
    "utf8",
  );

  function documentedCamaroRows(year) {
    const start = audit.indexOf(`## ${year}`);
    assert.notEqual(start, -1, `missing ${year} audit section`);
    const next = audit.indexOf("\n## ", start + 4);
    const section = audit.slice(start, next === -1 ? undefined : next);
    return [
      ...section.matchAll(
        /^\| (\d+) \| ([^|\r\n]+) \| (listed|restricted) \|\s*([^|\r\n]*?)\s*\|\r?$/gm,
      ),
    ]
      .map((match) => [
        match[1],
        match[2].trim(),
        match[3],
        match[4].trim(),
      ])
      .sort((left, right) => left.join("\0").localeCompare(right.join("\0")));
  }

  for (const year of years) {
    const actual = generation.colors
      .filter((entry) => entry.availability[year])
      .map((entry) => [
        entry.availability[year].code,
        entry.availability[year].label,
        entry.availability[year].state,
        entry.availability[year].restriction ?? "",
      ])
      .sort((left, right) => left.join("\0").localeCompare(right.join("\0")));
    assert.deepEqual(actual, documentedCamaroRows(year));
  }

  const color = (id) => generation.colors.find((entry) => entry.id === id);
  assert.equal(
    color("camaro-third-generation-dark-gold-metallic-1982")
      .availability["1982"].restriction,
    "Not available on Berlinetta",
  );
  assert.equal(
    color("camaro-third-generation-light-brown-metallic-1983")
      .availability["1985"].restriction,
    "Factory specification listing; absent from revised Dealer Order Guide",
  );
  assert.equal(
    color("camaro-third-generation-light-brown-metallic-1983")
      .availability["1986"].restriction,
    "Initial chart only; absent from revised Dealer Order Guide",
  );
  assert.equal(
    color("camaro-third-generation-copper-metallic-1985")
      .availability["1986"].restriction,
    "Initial chart only; absent from revised Dealer Order Guide",
  );
  assert.equal(
    color("camaro-third-generation-ultra-blue-metallic-1991")
      .availability["1991"].label,
    "Blue, Ultra (Met)",
  );
  assert.equal(
    color("camaro-third-generation-dark-green-gray-metallic-1992")
      .availability["1992"].label,
    "Green Dk, Gray (Met)",
  );
  assert.deepEqual(
    generation.colors
      .filter(
        (entry) =>
          entry.availability["1987"]?.restriction ===
          "Not available on California RS",
      )
      .map((entry) => entry.availability["1987"].code)
      .sort(),
    ["13", "23", "28", "51", "68", "74", "84"],
  );
  assert.deepEqual(
    generation.colors
      .filter((entry) => entry.availability["1987"]?.state === "listed")
      .map((entry) => entry.availability["1987"].code)
      .sort(),
    ["40", "41", "81"],
  );
  assert.equal(
    color("camaro-third-generation-silver-metallic-1982")
      .availability["1988"].restriction,
    "Non-IROC-Z only",
  );

  assert.match(
    audit,
    /1985 factory exterior-color specification[\s\S]*January 28, 1985 Dealer Order Guide omits/,
  );
  assert.match(
    audit,
    /1987 Color & Trim Selections chart confirms[\s\S]*only ones available[\s\S]*California RS[\s\S]*Z28 or IROC-Z application[\s\S]*remain unresolved/,
  );
  assert.match(
    audit,
    /stripe and decal colors[\s\S]*do not create another solid exterior-color listing/,
  );
});

test("Wikimedia Commons photos use the pinned GitHub Release with complete attribution", async () => {
  const { manifest, moduleSource, photoData } = await loadReleasePhotoData();
  const releasePrefix =
    "https://github.com/ipadmom/chevrolet-color-archive/releases/download/photo-archive-v1/";
  const legacyIds = manifest.assets.flatMap((asset) =>
    asset.selection_contexts
      .map((context) => context.legacy_id)
      .filter(Boolean),
  );

  assert.equal(manifest.github_release.owner, "ipadmom");
  assert.equal(manifest.github_release.repository, "chevrolet-color-archive");
  assert.equal(manifest.github_release.tag, "photo-archive-v1");
  assert.equal(new Set(manifest.assets.map((asset) => asset.candidate_id)).size, manifest.assets.length);
  assert.deepEqual(new Set(legacyIds), new Set([
    "commons-1969-camaro-ss396",
    "commons-1976-camaro-silver-f880311b",
    "commons-1979-camaro-blue-09e19346",
    "commons-1980-camaro-red-69ba1917",
    "commons-1981-camaro-black-cc3ffcaf",
  ]));

  for (const asset of manifest.assets) {
    assert.equal(asset.release_tag, manifest.github_release.tag);
    assert.ok(asset.release_asset_url.startsWith(releasePrefix));
    assert.ok(asset.site_asset_url.startsWith(releasePrefix));
    assert.equal(
      asset.site_asset_url,
      asset.preview_release_asset_url ?? asset.release_asset_url,
    );
    assert.match(asset.source_page_url, /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
    assert.ok(asset.author.trim());
    assert.ok(asset.attribution.trim());
    assert.ok(asset.license.trim());
    assert.match(asset.license_url, /^https?:\/\//);
  }

  assert.equal(photoData.archivedPhotos.length, manifest.assets.length);
  assert.ok(
    photoData.archivedPhotos.every(
      (photo) =>
        photo.src.startsWith(releasePrefix) &&
        photo.archiveOriginalUrl.startsWith(releasePrefix) &&
        photo.sourceUrl.startsWith("https://commons.wikimedia.org/wiki/File:") &&
        photo.attribution &&
        photo.licenseUrl,
    ),
  );
  assert.ok(photoData.archivedModelYearPhotos("camaro", "1969").length > 0);
  const tahoe2003Photos = photoData.archivedModelYearPhotos("tahoe", "2003");
  assert.ok(tahoe2003Photos.length > 0);
  assert.ok(
    tahoe2003Photos.every((photo) =>
      photoData.isExactYearPhoto(photo, "tahoe", "2003"),
    ),
  );
  assert.ok(!tahoe2003Photos.some((photo) => photo.year === "2015"));
  assert.equal(
    photoData.archivedColorPhotos("camaro", "1969", "hugger-orange").length,
    1,
  );
  assert.doesNotMatch(moduleSource, /upload\.wikimedia\.org|Special:Redirect\/file/);
});

test("C1 Corvette tables preserve source qualifications, codes, and counts", async () => {
  const { models } = await loadArchiveData();
  const corvette = models.find((model) => model.id === "corvette");
  const generation = corvette.generations.find(
    (item) => item.id === "early-corvette-audited-tables",
  );
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

test("Chevelle matrix preserves complete solid-color charts and exact-name rows", async () => {
  const { models } = await loadArchiveData();
  const chevelle = models.find((model) => model.id === "chevelle");
  const generation = chevelle.generations[0];

  assert.deepEqual(generation.years, ["1964", "1965", "1966", "1967"]);
  assert.equal(generation.listingCount, 59);
  assert.equal(generation.colors.length, 48);
  assert.deepEqual(
    Object.fromEntries(
      generation.years.map((year) => [
        year,
        generation.colors.filter((color) => color.availability[year]).length,
      ]),
    ),
    { 1964: 14, 1965: 15, 1966: 15, 1967: 15 },
  );
  const allGenerations = models.flatMap((model) => model.generations);
  const isQualifiedPalette = (item) =>
    Object.values(item.sources).some(
      (source) => source.evidenceClass === "qualified_palette_union",
    );
  const isSpecialtySubset = (item) =>
    Object.values(item.sources).some(
      (source) => source.evidenceClass === "specialty_palette_subset",
    );
  const isQualifiedHistoricalSubset = (item) =>
    Object.values(item.sources).some(
      (source) => source.evidenceClass === "qualified_historical_table",
    );
  assert.equal(
    allGenerations
      .filter(
        (item) =>
          !isQualifiedPalette(item) &&
          !isSpecialtySubset(item) &&
          !isQualifiedHistoricalSubset(item),
      )
      .reduce((total, item) => total + item.listingCount, 0),
    973,
  );
  assert.equal(
    allGenerations
      .filter(isQualifiedPalette)
      .reduce((total, item) => total + item.listingCount, 0),
    454,
  );
  assert.equal(
    allGenerations
      .filter(isSpecialtySubset)
      .reduce((total, item) => total + item.listingCount, 0),
    569,
  );
  assert.equal(
    allGenerations
      .filter(isQualifiedHistoricalSubset)
      .reduce((total, item) => total + item.listingCount, 0),
    4,
  );
  assert.equal(
    allGenerations.reduce((total, item) => total + item.listingCount, 0),
    2000,
  );
});

test("1969 and 1972–1976 Suburban publish only exact model-specific GM charts", async () => {
  const { models } = await loadArchiveData();
  const suburban = models.find((model) => model.id === "suburban");
  const early = suburban.generations.filter((generation) =>
    /^suburban-(1969|1972|1973|1974|1975|1976)-verified-official-solid-palette$/.test(
      generation.id,
    ),
  );
  assert.deepEqual(
    Object.fromEntries(early.map((generation) => [generation.years[0], generation.listingCount])),
    { 1969: 15, 1972: 15, 1973: 15, 1974: 15, 1975: 15, 1976: 15 },
  );
  const byYear = Object.fromEntries(
    early.map((generation) => [generation.years[0], generation]),
  );
  assert.equal(
    byYear["1969"].colors.find((color) => color.name === "Orange").rowCode,
    "516",
  );
  assert.equal(
    byYear["1972"].colors.find((color) => color.name === "Firebolt Orange").rowCode,
    "524",
  );
  assert.equal(
    byYear["1973"].colors.find((color) => color.name === "Marine Turquoise").rowCode,
    "568",
  );
  assert.match(
    byYear["1974"].colors.find((color) => color.name === "Killarney Green").note,
    /Conventional two-tone code 569.*Special two-tone code 570/,
  );
  assert.match(
    byYear["1975"].colors.find((color) => color.name === "Saratoga Silver Metallic")
      .note,
    /Frost White 12/,
  );
  for (const year of ["1969", "1972", "1973", "1974", "1975", "1976"]) {
    assert.equal(
      byYear[year].sources[year].sourceId,
      `gm-heritage-${year}-chevrolet-suburban`,
    );
    assert.equal(byYear[year].sources[year].retrievalHostType, "official_live");
  }
  for (const unresolvedYear of ["1970", "1971"]) {
    assert.equal(
      suburban.generations
        .filter((generation) => generation.years.includes(unresolvedYear))
        .every((generation) => generation.listingCount === 0),
      true,
    );
  }
});

test("1963, 1970, and 1971 Suburban retain explicit reviewed-no-chart records", async () => {
  const { models } = await loadArchiveData();
  const suburban = models.find((model) => model.id === "suburban");
  const expected = {
    "1963": [
      "03054f329c1739f8d2aa20057a25bc933d8482f0139c4c07dec723ed025e94a0",
      1700864,
      10,
      4,
    ],
    "1970": [
      "034533fef5679a22f1ad8fa179fb27f0dd41a9c050cfd6560322c636a9db3abd",
      1526015,
      10,
      1,
    ],
    "1971": [
      "54e322d01cc0f28b8b6245a390db29513370fa172aa32216f54594ce584260e3",
      683978,
      17,
      1,
    ],
  };

  for (const [year, [sha256, bytes, pages, supportingCount]] of Object.entries(
    expected,
  )) {
    const generation = suburban.generations.find(
      (candidate) => candidate.id === `suburban-${year}-reviewed-no-color-table`,
    );
    assert.ok(generation, `missing reviewed-no-chart generation for ${year}`);
    assert.equal(generation.listingCount, 0);
    assert.deepEqual(generation.colors, []);
    assert.match(generation.revisionNote, /documented no-chart result/);
    const source = generation.sources[year];
    assert.equal(source.chart, "Official kit reviewed; no exterior-color table found");
    assert.deepEqual(
      [source.artifactSha256, source.artifactBytes, source.pdfPageCount],
      [sha256, bytes, pages],
    );
    assert.match(
      source.archiveUrl,
      new RegExp(
        `releases/download/brochure-source-archive-v1/${year}-chevrolet-suburban-vehicle-information-kit-gm\\.pdf$`,
      ),
    );
    assert.equal(source.supportingSources.length, supportingCount);
  }

  const source1963 = suburban.generations.find(
    (candidate) => candidate.id === "suburban-1963-reviewed-no-color-table",
  ).sources["1963"];
  assert.deepEqual(
    source1963.supportingSources.map((source) => source.sourceId),
    [
      "gm-heritage-1963-chevrolet-truck",
      "chevrolet-service-news-1963-truck-refinish-extract",
      "chevrolet-service-news-volume-34-no-9",
      "corvanatics-corvair95-paint-trim-refinish-codes",
    ],
  );
  assert.ok(
    source1963.supportingSources.every((source) =>
      source.archiveUrl?.includes("/brochure-source-archive-v1/"),
    ),
  );
  assert.match(
    source1963.supportingSources.find(
      (source) => source.sourceId === "chevrolet-service-news-volume-34-no-9",
    ).retrievalUrl,
    /web\.archive\.org\/web\/20221017094958id_/,
  );
  const source1970 = suburban.generations.find(
    (candidate) => candidate.id === "suburban-1970-reviewed-no-color-table",
  ).sources["1970"];
  const autoColorLibrary = source1970.supportingSources.find(
    (source) => source.sourceId === "autocolorlibrary-1970-chevrolet-truck",
  );
  assert.equal(autoColorLibrary.publisher, "PPG Industries");
  assert.equal(autoColorLibrary.carrier, "Auto Color Library");
  assert.equal(autoColorLibrary.sourceType, "paint_chip_scan");
});

test("1977–1981 Suburban publishes each complete primary-color chart", async () => {
  const { models } = await loadArchiveData();
  const suburban = models.find((model) => model.id === "suburban");
  const generation = suburban.generations.find((item) => item.years.includes("1977"));
  const expected = {
    "1977": [
      ["86", "Black, Midnight"],
      ["20", "Blue, Lite (Light)"],
      ["23", "Blue, Hawaiian (Medium)"],
      ["25", "Blue, Mariner (Dark) (M)"],
      ["81", "Brown, Cordova (Dark) (M)"],
      ["65", "Buckskin"],
      ["43", "Green, Seamist (Light) (M)"],
      ["76", "Mahogany"],
      ["70", "Red, Cardinal (Medium)"],
      ["71", "Red, Metallic (Dark) (M)"],
      ["68", "Russet Metallic (M)"],
      ["17", "Silver, Saratoga (M)"],
      ["60", "Tan, Santa Fe"],
      ["12", "White, Frost"],
      ["53", "Yellow, Colonial"],
    ],
    "1978": [
      ["86", "Black, Midnight"],
      ["20", "Blue, Lite (Light)"],
      ["23", "Blue, Hawaiian (Medium)"],
      ["25", "Blue, Mariner (Dark) (M)"],
      ["81", "Brown, Cordova (Dark) (M)"],
      ["65", "Buckskin"],
      ["43", "Green, Seamist (Light) (M)"],
      ["76", "Mahogany"],
      ["70", "Red, Cardinal (Medium)"],
      ["71", "Red, Metallic (Dark) (M)"],
      ["68", "Russet Metallic (M)"],
      ["17", "Silver, Saratoga (M)"],
      ["60", "Tan, Santa Fe"],
      ["12", "White, Frost"],
      ["53", "Yellow, Colonial"],
    ],
    "1979": [
      ["12", "Frost White"],
      ["17", "Mystic Silver"],
      ["18", "Charcoal (Metallic)"],
      ["23", "Hawaiian Blue"],
      ["25", "Mariner Blue (Metallic)"],
      ["26", "Deep Blue"],
      ["43", "Shamrock Green (Metallic)"],
      ["46", "Holly Green"],
      ["53", "Colonial Yellow"],
      ["60", "Santa Fe Tan"],
      ["65", "Light Camel (Metallic)"],
      ["71", "Dark Carmine Red"],
      ["73", "Cardinal Red"],
      ["81", "Cordova Brown (Metallic)"],
      ["86", "Midnight Black"],
    ],
    "1980": [
      ["12", "Frost White"],
      ["17", "Mystic Silver (Metallic)"],
      ["18", "Charcoal (Metallic)"],
      ["23", "Medium Blue"],
      ["25", "Light Blue Metallic"],
      ["30", "Nordic Blue Metallic"],
      ["43", "Emerald Green"],
      ["60", "Santa Fe Tan"],
      ["62", "Dark Camel Metallic"],
      ["65", "Camel Metallic"],
      ["70", "Carmine Red"],
      ["71", "Dark Carmine Red"],
      ["73", "Cardinal Red"],
      ["86", "Midnight Black"],
      ["95", "Burnt Orange Metallic"],
    ],
    "1981": [
      ["12", "Frost White"],
      ["17", "Light Silver Metallic"],
      ["18", "Charcoal Metallic"],
      ["23", "Medium Blue"],
      ["25", "Light Blue Metallic"],
      ["30", "Nordic Blue Metallic"],
      ["43", "Emerald Green"],
      ["53", "Colonial Yellow"],
      ["60", "Santa Fe Tan"],
      ["65", "Dark Chestnut Metallic"],
      ["70", "Carmine Red"],
      ["71", "Dark Carmine Red"],
      ["73", "Cardinal Red"],
      ["86", "Midnight Black"],
      ["95", "Burnt Orange Metallic"],
    ],
  };

  assert.deepEqual(generation.years, ["1977", "1978", "1979", "1980", "1981"]);
  assert.equal(generation.listingCount, 75);
  for (const [year, yearExpected] of Object.entries(expected)) {
    const rows = generation.colors
      .filter((color) => color.availability[year])
      .map((color) => [
        color.availability[year].code,
        color.availability[year].label,
        color.availability[year].state,
      ])
      .sort((left, right) => left[0].localeCompare(right[0]) || left[1].localeCompare(right[1]));
    assert.deepEqual(
      rows,
      yearExpected
        .map(([code, name]) => [code, name, "listed"])
        .sort((left, right) => left[0].localeCompare(right[0]) || left[1].localeCompare(right[1])),
    );
  }
  assert.match(generation.sources["1977"].locator, /PDF p\. 6/);
  assert.match(generation.sources["1977"].url, /1977-Chevrolet-Suburban\.pdf$/);
  assert.match(generation.sources["1978"].locator, /PDF p\. 30/);
  assert.match(generation.sources["1978"].url, /1978-Chevrolet-Suburban\.pdf$/);
  assert.match(generation.sources["1979"].locator, /PDF p\. 32/);
  assert.match(generation.sources["1979"].url, /1979-Chevrolet-Suburban\.pdf$/);
  assert.match(generation.sources["1980"].locator, /PDF p\. 28/);
  assert.match(generation.sources["1980"].url, /1980-Chevrolet-Suburban\.pdf$/);
  assert.match(generation.sources["1981"].locator, /PDF p\. 26/);
  assert.match(generation.sources["1981"].url, /1981-Chevrolet-Suburban\.pdf$/);

  const audits = await Promise.all([
    readFile(new URL("docs/source-audit-suburban-1977.md", root), "utf8"),
    readFile(new URL("docs/source-audit-suburban-1978-1979.md", root), "utf8"),
    readFile(new URL("docs/source-audit-suburban-1980.md", root), "utf8"),
    readFile(new URL("docs/source-audit-suburban-1981.md", root), "utf8"),
  ]);
  for (const [year, yearExpected] of Object.entries(expected)) {
    const audit = year === "1977" ? audits[0] : year === "1980" ? audits[2] : year === "1981" ? audits[3] : audits[1];
    for (const [code, name] of yearExpected) {
      assert.ok(audit.includes(`| ${year} | ${code} | ${name} | Listed |`) || audit.includes(`| ${code} | ${name} | Listed |`));
    }
  }
  assert.match(audits[0], /Withheld two-tone evidence/);
  assert.match(audits[1], /Separate two-tone evidence/);
  assert.match(audits[2], /Separate two-tone evidence/);
  assert.match(audits[3], /Separate two-tone evidence/);
});

test("1983 Suburban is exact and does not borrow the separately sourced 1982 palette", async () => {
  const { models } = await loadArchiveData();
  const suburban = models.find((model) => model.id === "suburban");
  const generation = suburban.generations.find(
    (item) => item.id === "suburban-1983-audited-solid-colors",
  );
  const rows = generation.colors
    .filter((color) => color.availability["1983"])
    .map((color) => [
      color.availability["1983"].code,
      color.availability["1983"].label,
      color.availability["1983"].state,
    ]);

  assert.equal(generation.listingCount, 10);
  assert.deepEqual(rows, [
    ["59", "Almond", "listed"],
    ["19", "Black, Midnight", "listed"],
    ["21", "Blue, Light (Metallic)", "listed"],
    ["29", "Blue, Midnight", "listed"],
    ["63", "Bronze, Light (Metallic)", "listed"],
    ["68", "Mahogany (Metallic)", "listed"],
    ["70", "Red, Carmine", "listed"],
    ["17", "Silver (Metallic)", "listed"],
    ["12", "White, Frost", "listed"],
    ["53", "Yellow, Colonial", "listed"],
  ]);
  assert.match(generation.sources["1983"].locator, /PDF p\. 27/);
  assert.match(generation.sources["1983"].url, /1983-Chevrolet-Suburban\.pdf$/);
  const brochure1982 = suburban.generations.find(
    (item) => item.id === "suburban-1982-verified-brochure-palette",
  );
  assert.equal(brochure1982.listingCount, 10);
  assert.equal(
    brochure1982.colors.every((color) => color.rowCode === "not printed"),
    true,
  );
  assert.match(
    brochure1982.sources["1982"].url,
    /releases\/download\/brochure-source-archive-v1\/1982-chevrolet-suburban-brochure-xr793\.pdf$/,
  );
  assert.doesNotMatch(brochure1982.sources["1982"].url, /1983-Chevrolet/);

  const audit = await readFile(
    new URL("docs/source-audit-suburban-1983.md", root),
    "utf8",
  );
  for (const [code, name] of rows) {
    assert.ok(audit.includes(`| 1983 | ${code} | ${name} | Listed |`));
  }
  assert.match(audit, /1982.*not inferred/s);
});

test("1984–1985 Suburban preserves both complete governing charts", async () => {
  const { models } = await loadArchiveData();
  const suburban = models.find((model) => model.id === "suburban");
  const generation = suburban.generations.find(
    (item) => item.id === "suburban-1984-1985-audited-solid-colors",
  );
  const expected = [
    ["19", "Black, Midnight", "listed"],
    ["21", "Blue, Light (Metallic)", "listed"],
    ["29", "Blue, Midnight", "listed"],
    ["66", "Bronze, Indian (Metallic)", "listed"],
    ["72", "Red, Apple", "listed"],
    ["64", "Sand, Desert (Metallic)", "listed"],
    ["17", "Silver (Metallic)", "listed"],
    ["61", "Tan, Doeskin", "listed"],
    ["12", "White, Frost", "listed"],
    ["53", "Yellow, Colonial", "listed"],
  ];

  assert.equal(generation.listingCount, 20);
  for (const year of ["1984", "1985"]) {
    assert.deepEqual(
      generation.colors
        .filter((color) => color.availability[year])
        .map((color) => [
          color.availability[year].code,
          color.availability[year].label,
          color.availability[year].state,
        ]),
      expected,
    );
    assert.match(generation.sources[year].locator, /PDF p\. 31/);
    assert.match(generation.sources[year].url, new RegExp(`${year}-Chevrolet-Suburban\\.pdf$`));
  }

  const audit = await readFile(
    new URL("docs/source-audit-suburban-1984-1985.md", root),
    "utf8",
  );
  for (const year of ["1984", "1985"]) {
    for (const [code, name] of expected) {
      assert.ok(audit.includes(`| ${year} | ${code} | ${name} | Listed |`));
    }
  }
  assert.match(audit, /23 ZY5 combinations for each model year/);
});

test("1986 Suburban uses the exact revised official chart", async () => {
  const { models } = await loadArchiveData();
  const suburban = models.find((model) => model.id === "suburban");
  const generation = suburban.generations.find(
    (item) => item.id === "suburban-1986-audited-solid-colors",
  );
  const rows = generation.colors
    .filter((color) => color.availability["1986"])
    .map((color) => [
      color.availability["1986"].code,
      color.availability["1986"].label,
      color.availability["1986"].state,
    ]);

  assert.equal(generation.listingCount, 10);
  assert.deepEqual(rows, [
    ["19", "Black, Midnight", "listed"],
    ["21", "Blue, Light (Metallic)", "listed"],
    ["29", "Blue, Midnight", "listed"],
    ["66", "Bronze, Indian (Metallic)", "listed"],
    ["55", "Copper, Canyon (Metallic)", "listed"],
    ["67", "Gold, Nevada (Metallic)", "listed"],
    ["90", "Gray, Steel (Metallic)", "listed"],
    ["72", "Red, Apple", "listed"],
    ["61", "Tan, Doeskin", "listed"],
    ["12", "White, Frost", "listed"],
  ]);
  assert.match(generation.sources["1986"].locator, /PDF p\. 32/);
  assert.equal(generation.sources["1986"].supportingSources.length, 1);
  assert.match(
    generation.sources["1986"].supportingSources[0].locator,
    /1985 kit PDF p\. 67/,
  );
  assert.match(
    generation.sources["1986"].supportingSources[0].url,
    /1985-Chevrolet-Suburban\.pdf$/,
  );
  assert.match(generation.sources["1986"].url, /1986-Chevrolet-Suburban\.pdf$/);

  const audit = await readFile(
    new URL("docs/source-audit-suburban-1986.md", root),
    "utf8",
  );
  for (const [code, name] of rows) {
    assert.ok(audit.includes(`| 1986 | ${code} | ${name} | Listed |`));
  }
  assert.match(audit, /23 ZY5 combinations/);
});

test("1987 Suburban uses the exact February 1987 official chart", async () => {
  const { models } = await loadArchiveData();
  const suburban = models.find((model) => model.id === "suburban");
  const generation = suburban.generations.find(
    (item) => item.id === "suburban-1987-audited-solid-colors",
  );
  const rows = generation.colors
    .filter((color) => color.availability["1987"])
    .map((color) => [
      color.availability["1987"].code,
      color.availability["1987"].label,
      color.availability["1987"].state,
    ]);

  assert.equal(generation.listingCount, 10);
  assert.deepEqual(rows, [
    ["19", "Black, Midnight", "listed"],
    ["21", "Blue, Light (Metallic)", "listed"],
    ["29", "Blue, Midnight", "listed"],
    ["66", "Bronze, Indian (Metallic)", "listed"],
    ["55", "Copper, Canyon (Metallic)", "listed"],
    ["67", "Gold, Nevada (Metallic)", "listed"],
    ["90", "Gray, Steel (Metallic)", "listed"],
    ["72", "Red, Apple", "listed"],
    ["61", "Tan, Doeskin", "listed"],
    ["12", "White, Frost", "listed"],
  ]);
  assert.match(generation.sources["1987"].locator, /PDF p\. 39/);
  assert.match(generation.sources["1987"].url, /1987-Chevrolet-Suburban\.pdf$/);

  const audit = await readFile(
    new URL("docs/source-audit-suburban-1987.md", root),
    "utf8",
  );
  for (const [code, name] of rows) {
    assert.ok(audit.includes(`| 1987 | ${code} | ${name} | Listed |`));
  }
  assert.match(audit, /23 ZY5 combinations/);
});

test("1988 Suburban uses the exact September 1987 primary chart", async () => {
  const { models } = await loadArchiveData();
  const suburban = models.find((model) => model.id === "suburban");
  const generation = suburban.generations.find(
    (item) => item.id === "suburban-1988-audited-solid-colors",
  );
  const rows = generation.colors
    .filter((color) => color.availability["1988"])
    .map((color) => [
      color.availability["1988"].code,
      color.availability["1988"].label,
      color.availability["1988"].state,
    ]);

  assert.equal(generation.listingCount, 10);
  assert.deepEqual(rows, [
    ["19", "Black, Midnight", "listed"],
    ["24", "Blue, Aspen (Metallic)", "listed"],
    ["29", "Blue, Midnight", "listed"],
    ["39", "Brown, Woodlands (Metallic)", "listed"],
    ["44", "Emerald (Metallic)", "listed"],
    ["67", "Gold, Nevada (Metallic)", "listed"],
    ["90", "Gray, Steel (Metallic)", "listed"],
    ["72", "Red, Apple", "listed"],
    ["61", "Tan, Doeskin", "listed"],
    ["12", "White, Frost", "listed"],
  ]);
  assert.match(generation.sources["1988"].locator, /PDF p\. 29/);
  assert.match(generation.sources["1988"].locator, /PDF p\. 30/);
  assert.match(generation.sources["1988"].url, /1988-Chevrolet-Suburban\.pdf$/);

  const audit = await readFile(
    new URL("docs/source-audit-suburban-1988.md", root),
    "utf8",
  );
  for (const [code, name] of rows) {
    assert.ok(audit.includes(`| 1988 | ${code} | ${name} | Listed |`));
  }
  assert.match(audit, /ZY5 Exterior Decor Package/);
});

test("1989 Suburban uses the complete exact-year GM sales-brochure palette", async () => {
  const { models } = await loadArchiveData();
  const suburban = models.find((model) => model.id === "suburban");
  const generation = suburban.generations.find(
    (item) => item.id === "suburban-1989-verified-brochure-palette",
  );
  assert.deepEqual(
    generation.colors.map((color) => color.name),
    [
      "Mojave Beige",
      "Onyx Black",
      "Midnight Blue Metallic",
      "Smoke Blue Metallic",
      "Sunset Gold Metallic",
      "Gray Metallic",
      "Quicksilver Metallic",
      "Fire Red",
      "Summit White",
      "Wintergreen",
    ],
  );
  assert.equal(generation.colors.every((color) => color.rowCode === "not printed"), true);
  assert.match(
    generation.sources["1989"].url,
    /releases\/download\/brochure-source-archive-v1\/1989-chevrolet-suburban-brochure-xr793\.pdf$/,
  );

  const [kitAudit, brochureAudit] = await Promise.all([
    readFile(new URL("docs/source-audit-suburban-1989.md", root), "utf8"),
    readFile(
      new URL("docs/source-audit-suburban-1982-1989-1993.md", root),
      "utf8",
    ),
  ]);
  assert.match(kitAudit, /does not contain a\s+governing solid/s);
  assert.match(brochureAudit, /1989.*Resolved/s);
  assert.match(brochureAudit, /Interior & Exterior Color Availability/);
});

test("1990–1994 Suburban publishes only exact governing primary rows", async () => {
  const { models } = await loadArchiveData();
  const suburban = models.find((model) => model.id === "suburban");
  const expected = {
    "1990": [
      ["20", "Onyx Black"],
      ["27", "Smoke Blue Met."],
      ["33", "Mojave Beige"],
      ["36", "Wintergreen Met."],
      ["50", "Summit White"],
      ["74", "Fire Red"],
      ["83", "Gray Met."],
      ["96", "Quicksilver Met."],
      ["98", "Midnight Blue Met."],
    ],
    "1991": [
      ["22", "Brilliant Blue Met."],
      ["27", "Smoke Blue Met."],
      ["33", "Mojave Beige"],
      ["41", "Onyx Black"],
      ["50", "Summit White"],
      ["74", "Fire Red"],
      ["96", "Quicksilver Met."],
      ["97", "Slate Met."],
      ["98", "Midnight Blue Met."],
    ],
    "1992": [
      ["22", "Brilliant Blue Met."],
      ["27", "Smoke Blue Met."],
      ["36", "Teal Blue Met."],
      ["41", "Onyx Black"],
      ["50", "Summit White"],
      ["57", "Sand Beige Met."],
      ["74", "Victory Red"],
      ["76", "Burnt Red Met."],
      ["96", "Quicksilver Met."],
      ["97", "Slate Met."],
    ],
    "1994": [
      ["56", "Autumnwood, Dk (Met)"],
      ["55", "Autumnwood, Lt (Met)"],
      ["41", "Black, Onyx"],
      ["30", "Blue, Atlantic (Met)"],
      ["39", "Blue, Indigo (Met)"],
      ["36", "Blue, Teal (Met)"],
      ["96", "Quicksilver (Met)"],
      ["76", "Red, Burnt (Met)"],
      ["74", "Red, Victory"],
      ["50", "White, Summit"],
    ],
  };
  const artifacts = {
    "1990": [
      "46b985c6943036e27efd890122a3d3ffc5d0ba625d19305a978da5d3fec57df9",
      1130037,
      27,
    ],
    "1991": [
      "24f2a80e283d48d02a137e0c71114e76d31466515130aa8b21a93d1ac1a0ff7f",
      1229801,
      29,
    ],
    "1992": [
      "c91ee8f67a3e33f5e6485572f1347e90d12de287dcf8720e0529599032a05b78",
      746842,
      23,
    ],
    "1994": [
      "895ef9992d0f5172084047683acfa8d543acea6bf37464df24fee50d9e3385df",
      1078053,
      28,
    ],
  };

  for (const [year, yearExpected] of Object.entries(expected)) {
    const generation = suburban.generations.find(
      (item) => item.id === `suburban-${year}-audited-solid-colors`,
    );
    assert.ok(generation, `missing ${year} audited Suburban generation`);
    assert.equal(generation.listingCount, yearExpected.length);
    assert.deepEqual(
      generation.colors
        .filter((color) => color.availability[year])
        .map((color) => [
          color.availability[year].code,
          color.availability[year].label,
        ]),
      yearExpected,
    );
    assert.deepEqual(
      [
        generation.sources[year].artifactSha256,
        generation.sources[year].artifactBytes,
        generation.sources[year].pdfPageCount,
      ],
      artifacts[year],
    );
    assert.match(generation.sources[year].url, new RegExp(`${year}-Chevrolet-Suburban\\.pdf$`));
  }

  const brochure1993 = suburban.generations.find(
    (generation) => generation.id === "suburban-1993-verified-brochure-palette",
  );
  assert.deepEqual(
    brochure1993.colors.map((color) => [color.rowCode, color.name]),
    [
      ["#57", "Sand Beige Met."],
      ["#41", "Onyx Black"],
      ["#39", "Indigo Blue Met."],
      ["#27", "Smoke Blue Met."],
      ["#36", "Teal Blue Met."],
      ["#96", "Quicksilver Met."],
      ["#76", "Burnt Red Met."],
      ["#74", "Victory Red"],
      ["#97", "Slate Met."],
      ["#50", "Summit White"],
    ],
  );
  assert.match(
    brochure1993.sources["1993"].limitations.join(" "),
    /marketplace listing's 16-image photograph set/,
  );
  assert.equal(
    brochure1993.sources["1993"].publisher,
    "Chevrolet Motor Division, General Motors Corporation",
  );
  assert.equal(
    brochure1993.sources["1993"].carrier,
    "Poshmark public marketplace listing photograph set",
  );
  assert.match(brochure1993.sources["1993"].retrievalUrl, /cloudfront\.net/);
  assert.match(brochure1993.sources["1993"].landingUrl, /poshmark\.com\/listing/);
  assert.equal(brochure1993.sources["1993"].reuseLicense, "No reuse license stated.");
  assert.match(suburban.status, /36 complete model-year color palettes verified/);

  const audit = await readFile(
    new URL("docs/source-audit-suburban-1990-1994.md", root),
    "utf8",
  );
  for (const [year, yearExpected] of Object.entries(expected)) {
    for (const [code, name] of yearExpected) {
      assert.ok(audit.includes(`${code} ${name} /`), `${year} ${code} ${name} missing from audit`);
    }
  }
  assert.match(audit, /97 Slate Met\. \/ 76 Fire Red/);
  assert.match(audit, /22 exact same-code rows[\s\S]*ten distinct primary exterior colors/);
  assert.match(audit, /1993 yields no standalone primary-color rows/);
  assert.match(audit, /code for Blue, Indigo on this chart is 39/);
  assert.match(audit, /handwritten note[\s\S]*not printed factory text[\s\S]*does not replace/);
  assert.match(
    audit,
    /\| 1993 \| `gm-heritage-1993-chevrolet-suburban` \| `607f0de7aa91612d9c406dd41df126b1959bd13d9d74c05c3137f01739b23341` \| 573,990 \| 14 \|/,
  );

  const countNumberedRows = (startHeading, endHeading) => {
    const start = audit.indexOf(startHeading);
    const end = audit.indexOf(endHeading, start + startHeading.length);
    assert.notEqual(start, -1, `missing audit heading: ${startHeading}`);
    assert.notEqual(end, -1, `missing audit heading: ${endHeading}`);
    return (audit.slice(start, end).match(/^\d+\. /gm) ?? []).length;
  };
  assert.equal(countNumberedRows("### ZY1 same-code primary rows, PDF p20, printed p19", "### ZY2 Conventional Two-Tone rows, PDF p21, printed p20"), 9);
  assert.equal(countNumberedRows("### ZY2 Conventional Two-Tone rows, PDF p21, printed p20", "### ZY3 Special Two-Tone and ZY4 Deluxe Two-Tone, identical 51-row table"), 33);
  assert.equal(countNumberedRows("### ZY3 Special Two-Tone and ZY4 Deluxe Two-Tone, identical 51-row table", "## 1991 R/V Suburban"), 51);
  assert.equal(countNumberedRows("### ZY1 same-code primary rows, PDF p20, printed p19, dated October 1990", "### ZY2 Conventional Two-Tone rows, PDF p21, printed p20, dated October 1990"), 9);
  assert.equal(countNumberedRows("### ZY2 Conventional Two-Tone rows, PDF p21, printed p20, dated October 1990", "### ZY3 Special Two-Tone and ZY4 Deluxe Two-Tone, identical 55-row table"), 37);
  assert.equal(countNumberedRows("### ZY3 Special Two-Tone and ZY4 Deluxe Two-Tone, identical 55-row table", "## 1992 C/K Suburban"), 55);
  assert.equal(countNumberedRows("### ZY1 same-code primary rows, with optional D85 stripe, PDF p20, printed p19", "### ZY2 Conventional Two-Tone rows, with optional D85 stripe, PDF p21, printed p20"), 22);
  assert.equal(countNumberedRows("### ZY2 Conventional Two-Tone rows, with optional D85 stripe, PDF p21, printed p20", "### ZY3 Special Two-Tone and ZY4 Deluxe Two-Tone, 54 shared exact rows plus divergent block"), 57);
  assert.equal(countNumberedRows("### ZY3 Special Two-Tone and ZY4 Deluxe Two-Tone, 54 shared exact rows plus divergent block", "## 1993 C/K 1500 and C/K 2500 Suburban"), 54);
  assert.equal(countNumberedRows("### ZY4 exact scheme rows, PDF p10, printed Order Guide p15", "## 1994 C/K 1500 and C/K 2500 Suburban"), 31);
  assert.equal(countNumberedRows("### Exact same-code primary exterior rows, from the combined ZY1/ZY2 chart", "### Complete combined ZY1 and ZY2 row list, PDF p19, printed Order Guide p14"), 10);
  assert.equal(countNumberedRows("### Complete combined ZY1 and ZY2 row list, PDF p19, printed Order Guide p14", "### ZY4 exact scheme rows, PDF p20, printed Order Guide p15"), 32);
  assert.equal((audit.slice(audit.indexOf("### ZY4 exact scheme rows, PDF p20, printed Order Guide p15")).match(/^\d+\. /gm) ?? []).length, 21);
});

test("1995–1999 Suburban preserves exact ZY1 palettes and ordered-code boundaries", async () => {
  const { models } = await loadArchiveData();
  const suburban = models.find((model) => model.id === "suburban");
  const generation = suburban.generations.find(
    (item) => item.id === "suburban-1995-1999-audited-solid-colors",
  );
  const expected = {
    "1995": [
      ["55U", "AUTUMNWOOD, LT (Met)"],
      ["41U", "BLACK, ONYX"],
      ["30U", "BLUE, ATLANTIC (Met)"],
      ["39U", "BLUE, INDIGO (Met)"],
      ["36U", "BLUE, TEAL (Met)"],
      ["43U", "GREEN, EMERALD (Met)"],
      ["96U", "QUICKSILVER (Met)"],
      ["76U", "RED, BURNT (Met)"],
      ["74U", "RED, VICTORY"],
      ["50U", "WHITE, SUMMIT"],
    ],
    "1996": [
      ["55U", "AUTUMNWOOD, LT (Met)"],
      ["41U", "BLACK, ONYX"],
      ["30U", "BLUE, ATLANTIC (Met)"],
      ["39U", "BLUE, INDIGO (Met)"],
      ["43U", "GREEN, EMERALD (Met)"],
      ["96U", "QUICKSILVER (Met)"],
      ["77U", "RED, CHERRY (Met)"],
      ["59U", "CHERRY ICE (Met)"],
      ["74U", "RED, VICTORY"],
      ["50U", "WHITE, SUMMIT"],
    ],
    "1997": [
      ["65U", "BEIGE, MYSTIQUE MED (Met)"],
      ["41U", "BLACK, ONYX"],
      ["39U", "BLUE, INDIGO (Met)"],
      ["59U", "CHERRY ICE (Met)"],
      ["43U", "GREEN, EMERALD (Met)"],
      ["96U", "QUICKSILVER (Met)"],
      ["77U", "RED, CHERRY (Met)"],
      ["74U", "RED, VICTORY"],
      ["50U", "WHITE, SUMMIT"],
    ],
    "1998": [
      ["65U", "BEIGE, MYSTIQUE MED (Met)"],
      ["41U", "BLACK, ONYX"],
      ["69U", "COPPER, DK (Met)"],
      ["43U", "GREEN EMERALD (Met)"],
      ["39U", "INDIGO, BLUE (Met)"],
      ["11U", "PEWTER, LT (Met)"],
      ["51U", "RED, CARMINE DK, (Met)"],
      ["74U", "RED, VICTORY"],
      ["50U", "WHITE, SUMMIT"],
    ],
    "1999": [
      ["41U", "BLACK, ONYX"],
      ["39U", "BLUE, INDIGO (Met)"],
      ["69U", "COPPER, DK (Met)"],
      ["60U", "GOLD, SUNSET(Met)"],
      ["14U", "GRAY, CHARCOAL MED (Met)"],
      ["68U", "GREEN, MEADOW (Met)"],
      ["11U", "PEWTER, LT (Met)"],
      ["51U", "RED, CARMINE DK, (Met)"],
      ["74U", "RED, VICTORY"],
      ["50U", "WHITE, SUMMIT"],
    ],
  };
  const artifacts = {
    "1995": [
      "19161144f0aecfd285c1d4e51e549a8e39c70e7b3d42a139c240404fcef4fe9b",
      962051,
      28,
      "Revised 4-10-95",
    ],
    "1996": [
      "c7f1f9a1537331b0f4b5ba6bb96baf3d9bfe3919b4cb3e5241e2cf704ecdb217",
      770378,
      24,
      "Revised 1-29-96",
    ],
    "1997": [
      "1d28da68523c509ffce68ce2e96ef5566894dd886caf761071afce6b5b240a1d",
      948044,
      33,
      "Revised 12-16-96",
    ],
    "1998": [
      "7975a9871c0b41551bc5802aa1c833c25e31de238abce8d424def565261c3449",
      2294103,
      56,
      "Revised 9-2-97",
    ],
    "1999": [
      "684a88324706a990ad05687faee61b1d45f2e7af3ce7f291df4f47c3c3800598",
      1747598,
      47,
      "Published 4-1-98",
    ],
  };
  const sortRows = (rows) =>
    [...rows].sort(
      (left, right) =>
        left[0].localeCompare(right[0]) || left[1].localeCompare(right[1]),
    );

  assert.deepEqual(generation.years, ["1995", "1996", "1997", "1998", "1999"]);
  assert.equal(generation.listingCount, 48);
  for (const [year, yearExpected] of Object.entries(expected)) {
    const rows = generation.colors
      .filter((color) => color.availability[year])
      .map((color) => [
        color.availability[year].code,
        color.availability[year].label,
      ]);
    assert.deepEqual(sortRows(rows), sortRows(yearExpected));
    assert.equal(rows.every(([code]) => code.endsWith("U")), true);
    assert.equal(
      generation.colors
        .filter((color) => color.availability[year])
        .every((color) => color.availability[year].state === "listed"),
      true,
    );
    assert.deepEqual(
      [
        generation.sources[year].artifactSha256,
        generation.sources[year].artifactBytes,
        generation.sources[year].pdfPageCount,
        generation.sources[year].revision,
      ],
      artifacts[year],
    );
    assert.match(
      generation.sources[year].url,
      new RegExp(`${year}-Chevrolet-Suburban\\.pdf$`),
    );
  }
  assert.equal(
    generation.colors.some(
      (color) =>
        color.availability["1997"]?.code === "55U" ||
        color.availability["1998"]?.code === "55U",
    ),
    false,
  );
  assert.match(generation.sources["1998"].locator, /lists only ZY1 and ZY2/);
  assert.match(generation.sources["1999"].locator, /lists only ZY1 and ZY2/);
  assert.match(generation.revisionNote, /no ZY4 rows are inferred/);
  assert.match(suburban.status, /36 complete model-year color palettes verified/);

  const audit = await readFile(
    new URL("docs/source-audit-suburban-1995-1999.md", root),
    "utf8",
  );
  for (const [year, yearExpected] of Object.entries(expected)) {
    for (const [code, name] of yearExpected) {
      assert.ok(
        audit.includes(`| ${name} | \`${code}\` |`),
        `${year} ${code} ${name} missing from audit`,
      );
    }
  }
  const years = ["1995", "1996", "1997", "1998", "1999"];
  const yearSections = Object.fromEntries(
    years.map((year, index) => {
      const start = audit.indexOf(`## ${year}`);
      const nextHeading =
        years[index + 1] === undefined
          ? "## Year-by-year governing result"
          : `## ${years[index + 1]}`;
      const end = audit.indexOf(nextHeading, start + year.length + 3);
      assert.notEqual(start, -1, `missing audit year heading: ${year}`);
      assert.notEqual(end, -1, `missing audit heading: ${nextHeading}`);
      return [year, audit.slice(start, end)];
    }),
  );
  const countCodedRows = (year, startHeading, endHeading) => {
    const section = yearSections[year];
    const start = section.indexOf(startHeading);
    const end = endHeading
      ? section.indexOf(endHeading, start + startHeading.length)
      : section.length;
    assert.notEqual(start, -1, `missing audit heading: ${startHeading}`);
    if (endHeading) {
      assert.notEqual(end, -1, `missing audit heading: ${endHeading}`);
    }
    return (section.slice(start, end).match(/^\| .* \| `\d+U` \|/gm) ?? [])
      .length;
  };
  assert.equal(countCodedRows("1995", "### ZY1 standalone palette, 10 rows", "### ZY2 conventional two-tone, 22 rows"), 10);
  assert.equal(countCodedRows("1995", "### ZY2 conventional two-tone, 22 rows", "### ZY4 deluxe two-tone, 25 rows"), 22);
  assert.equal(countCodedRows("1995", "### ZY4 deluxe two-tone, 25 rows"), 25);
  assert.equal(countCodedRows("1996", "### ZY1 standalone palette, 10 rows", "### ZY2 conventional two-tone, 24 rows"), 10);
  assert.equal(countCodedRows("1996", "### ZY2 conventional two-tone, 24 rows", "### ZY4 deluxe two-tone, 27 rows"), 24);
  assert.equal(countCodedRows("1996", "### ZY4 deluxe two-tone, 27 rows"), 27);
  assert.equal(countCodedRows("1997", "### ZY1 standalone palette, 9 rows", "### ZY2 conventional two-tone, 27 rows"), 9);
  assert.equal(countCodedRows("1997", "### ZY2 conventional two-tone, 27 rows", "### ZY4 deluxe two-tone, 16 rows"), 27);
  assert.equal(countCodedRows("1997", "### ZY4 deluxe two-tone, 16 rows"), 16);
  assert.equal(countCodedRows("1998", "### ZY1 standalone palette, 9 rows", "### ZY2 conventional two-tone, 21 rows"), 9);
  assert.equal(countCodedRows("1998", "### ZY2 conventional two-tone, 21 rows"), 21);
  assert.equal(countCodedRows("1999", "### ZY1 standalone palette, 10 rows", "### ZY2 conventional two-tone, 34 rows"), 10);
  assert.equal(countCodedRows("1999", "### ZY2 conventional two-tone, 34 rows"), 34);
  assert.equal((audit.match(/^\| .* \| `\d+U` \|/gm) ?? []).length, 244);
  assert.match(audit, /Total: 48 standalone rows and 196 non-standalone scheme rows, 244 chart rows overall/);
  assert.match(
    yearSections["1998"],
    /lists only `ZY1 Solid` and `ZY2 Conventional Two-Tone`\. No ZY4 row or ZY4 chart/,
  );
  assert.match(
    yearSections["1999"],
    /lists only `ZY1 Solid` and `ZY2 Conventional Two-Tone`[\s\S]*No ZY4 row or ZY4 chart/,
  );
  assert.match(audit, /only `55L` appears in scheme rows; there is no 1997 or 1998 `55U` standalone row/);
  assert.match(audit, /Never infer a Suburban row from Tahoe/);
});

test("2000–2007 Suburban separates complete palettes, SEO paints, and supplemental leads", async () => {
  const [{ models }, auditText] = await Promise.all([
    loadArchiveData(),
    readFile(new URL("data/audits/suburban-2000-2007.json", root), "utf8"),
  ]);
  const audit = JSON.parse(auditText);
  const suburban = models.find((model) => model.id === "suburban");
  const regular = suburban.generations.filter((generation) =>
    /^suburban-(2000|2001|2002|2003|2004|2005|2007)-audited-regular-colors$/.test(generation.id),
  );
  const seo = suburban.generations.filter((generation) =>
    /^suburban-(2005|2007)-seo-solid-paint-subset$/.test(generation.id),
  );

  assert.deepEqual(
    Object.fromEntries(regular.map((generation) => [generation.years[0], generation.listingCount])),
    { 2000: 9, 2001: 9, 2002: 8, 2003: 8, 2004: 8, 2005: 8, 2007: 9 },
  );
  assert.deepEqual(
    Object.fromEntries(seo.map((generation) => [generation.years[0], generation.listingCount])),
    { 2005: 10, 2007: 10 },
  );
  assert.equal(
    seo.every(
      (generation) =>
        generation.sources[generation.years[0]].evidenceClass ===
        "specialty_palette_subset",
    ),
    true,
  );

  const regular2005 = regular.find((generation) => generation.years[0] === "2005");
  assert.equal(
    regular2005.colors.find((color) => color.name === "Sandstone Metallic").rowCode,
    "15U / WA-929L",
  );
  const regular2007 = regular.find((generation) => generation.years[0] === "2007");
  assert.match(
    regular2007.colors.find((color) => color.name === "Amber Bronze Metallic")
      .availability["2007"].restriction,
    /Not available on 3\/4-ton models/,
  );
  const seo2005 = seo.find((generation) => generation.years[0] === "2005");
  assert.equal(
    seo2005.colors.find(
      (color) => color.name === "Blue" && color.rowCode.includes("WA-5665"),
    ).rowCode,
    "none / WA-5665",
  );
  assert.equal(
    seo2005.colors.find((color) => color.name === "Green, Woodland").rowCode,
    "9V5 / WA-9015",
  );

  const regular2002 = regular.find((generation) => generation.years[0] === "2002");
  assert.equal(
    regular2002.colors.find((color) => color.name === "Redfire Metallic").rowCode,
    "not printed",
  );
  assert.match(
    regular2002.colors.find((color) => color.name === "Redfire Metallic")
      .availability["2002"].restriction,
    /not available on three-quarter-ton models/,
  );
  assert.equal(
    regular2002.sources["2002"].retrievalHostType,
    "archival_mirror",
  );
  assert.match(regular2002.sources["2002"].archiveUrl, /brochure-source-archive-v1/);
  assert.equal(
    regular2002.sources["2002"].retrievalUrl,
    "https://www.auto-brochures.com/makes/Chevrolet/Suburban/Chevrolet_US%20Suburban_2002.pdf",
  );
  const regular2003 = regular.find((generation) => generation.years[0] === "2003");
  assert.equal(
    regular2003.colors.find((color) => color.name === "Dark Gray Metallic").rowCode,
    "not printed",
  );
  assert.match(regular2003.sources["2003"].locator, /PDF page 17/);

  const regular2004 = regular.find((generation) => generation.years[0] === "2004");
  assert.equal(
    regular2004.colors.find((color) => color.name === "Dark Spiral Gray Metallic")
      .rowCode,
    "62 / WA-805K",
  );
  assert.equal(regular2004.sources["2004"].contentType, "image/png");
  assert.equal(regular2004.sources["2004"].supportingSources.length, 2);

  assert.equal(
    suburban.generations
      .filter((generation) => generation.years.includes("2006"))
      .every((generation) => generation.listingCount === 0),
    true,
  );
  assert.deepEqual(
    Object.fromEntries(
      audit.years.map((record) => [record.year, record.supplemental_colors.length]),
    ),
    { 2000: 0, 2001: 0, 2002: 0, 2003: 0, 2004: 0, 2005: 0, 2006: 0, 2007: 0 },
  );
  assert.equal(
    audit.years.find((record) => record.year === 2006).audit_status,
    "source_missing",
  );
});

test("Tahoe publishes exact 1995-2007 palettes without flattening 2000 programs", async () => {
  const [{ models }, earlyText, laterText] = await Promise.all([
    loadArchiveData(),
    readFile(new URL("data/audits/tahoe-1995-2000.json", root), "utf8"),
    readFile(new URL("data/audits/tahoe-2001-2007.json", root), "utf8"),
  ]);
  const tahoe = models.find((model) => model.id === "tahoe");
  const early = JSON.parse(earlyText);
  const later = JSON.parse(laterText);
  const reviewed = tahoe.generations.filter((generation) =>
    generation.id.startsWith("tahoe-official-"),
  );
  const programs2000 = tahoe.generations.filter((generation) =>
    generation.id.startsWith("tahoe-2000-"),
  );
  const qualifiedPalettes = tahoe.generations.filter((generation) =>
    Object.values(generation.sources).some(
      (source) => source.evidenceClass === "qualified_palette_union",
    ),
  );
  const reviewedYears = [...new Set([
    ...reviewed.flatMap((generation) => generation.years),
    ...programs2000.flatMap((generation) => generation.years),
  ])].sort((left, right) => Number(left) - Number(right));

  assert.deepEqual(reviewedYears, [
    "1995",
    "1996",
    "1997",
    "1998",
    "1999",
    "2000",
    "2001",
    "2002",
    "2003",
    "2004",
    "2005",
    "2006",
    "2007",
  ]);
  assert.deepEqual(
    reviewed.map((generation) => generation.listingCount),
    [48, 49, 9],
  );
  assert.deepEqual(
    programs2000.map((generation) => generation.listingCount),
    [9, 5, 1, 4],
  );
  assert.deepEqual(
    programs2000.map((generation) => generation.id),
    [
      "tahoe-2000-gmt800-base-ls",
      "tahoe-2000-gmt800-lt",
      "tahoe-2000-gmt400-limited",
      "tahoe-2000-gmt400-z71",
    ],
  );
  assert.match(programs2000[0].sources["2000"].locator, /PDF p\. 18, printed p\. 9/);
  assert.match(programs2000[0].sources["2000"].chart, /Base and LS Paint Colors/);
  assert.match(programs2000[1].sources["2000"].locator, /PDF p\. 18, printed p\. 9/);
  assert.match(programs2000[1].sources["2000"].chart, /LT Paint Colors/);
  assert.match(
    programs2000[2].sources["2000"].locator,
    /PDF pp\. 12 and 13, printed pp\. 3 and 4/,
  );
  const z71 = programs2000.at(-1);
  assert.equal(
    z71.sources["2000"].evidenceClass,
    "qualified_exact_program_palette",
  );
  assert.equal(z71.sources["2000"].sourceId, "chevrolet-sales-brochure-2000-tahoe-z71-colors-scan");
  assert.equal(z71.sources["2000"].supportingSources.length, 4);
  assert.ok(z71.colors.every((color) => color.rowCode === "Not printed"));
  assert.ok(
    z71.colors.every((color) =>
      /Program-specific palette: Carryover GMT400 Tahoe Z71/.test(
        color.availability["2000"].restriction,
      ),
    ),
  );

  const regular = reviewed.find((generation) => generation.years.includes("2002"));
  const colorFor = (year, name) =>
    regular.colors.find(
      (color) => color.name === name && color.availability[year],
    );
  assert.equal(
    regular.colors.filter((color) => color.availability["2002"]).length,
    8,
  );
  assert.equal(colorFor("2002", "Forest Green Metallic").availability["2002"].code, "Not printed");
  assert.match(colorFor("2002", "Indigo Blue Metallic").availability["2002"].restriction, /not available on Z71/);
  assert.equal(regular.sources["2002"].sourceId, "chevrolet-sales-brochure-2002-tahoe");
  assert.equal(regular.sources["2002"].retrievalHostType, "archival_mirror");
  assert.equal(regular.sources["2002"].supportingSources.length, 2);
  const independent2002Reference = regular.sources["2002"].supportingSources.find(
    (source) =>
      source.sourceId === "chevrolet-sales-brochure-2002-tahoe-independent-copy",
  );
  assert.ok(independent2002Reference);
  assert.equal(independent2002Reference.archiveUrl, undefined);
  assert.match(independent2002Reference.revision, /Historical carrier reference only/);

  assert.equal(colorFor("2003", "Dark Gray Metallic").availability["2003"].code, "62U / WA-805K");
  assert.match(colorFor("2003", "Redfire Metallic").availability["2003"].restriction, /conflicts with that brochure/);
  assert.equal(regular.sources["2003"].sourceId, "gm-heritage-2003-chevrolet-tahoe");
  assert.equal(regular.sources["2003"].supportingSources[0].sourceId, "chevrolet-sales-brochure-2003-tahoe");

  assert.equal(colorFor("2004", "Dark Gray Metallic").availability["2004"].code, "62 / WA-805K");
  assert.equal(regular.sources["2004"].sourceId, "chevrolet-spec-sheet-us-2004-tahoe");
  assert.equal(regular.sources["2004"].supportingSources[0].sourceId, "sherwin-williams-gm-2004-color-compatibility-guide");
  assert.match(colorFor("2005", "Bermuda Blue Metallic").availability["2005"].restriction, /extra-cost color/);
  assert.match(colorFor("2006", "Dark Blue Metallic").availability["2006"].restriction, /Not available on Z71/);

  const year2000 = early.years.find((item) => item.year === 2000);
  assert.equal(year2000.coverage_status, "verified_program_specific");
  assert.deepEqual(year2000.program_palettes.map((item) => item.colors.length), [9, 5, 1, 4]);
  assert.ok(year2000.program_palettes.every((item) => item.colors.every((color) => color.code === null)));
  const year2002 = later.years.find((item) => item.year === 2002);
  assert.equal(year2002.exterior_colors.length, 8);
  assert.ok(year2002.exterior_colors.every((color) => color.code === null));
  assert.equal(year2002.secondary_code_crosswalk.length, 8);
  const year2003 = later.years.find((item) => item.year === 2003);
  assert.equal(year2003.seo_chart_entries.length, 9);
  assert.equal(
    year2003.seo_chart_entries.filter((item) => item.availability_status === "orderable_with_tgk").length,
    4,
  );

  assert.deepEqual(
    qualifiedPalettes.flatMap((generation) => generation.years),
    ["2022", "2025", "2026"],
  );
  assert.deepEqual(
    qualifiedPalettes.map((generation) => generation.listingCount),
    [10, 8, 8],
  );
  assert.equal(
    qualifiedPalettes.every((generation) =>
      generation.colors.every((color) => color.rowCode === "not printed"),
    ),
    true,
  );
  assert.equal(
    qualifiedPalettes.every((generation) =>
      generation.colors.every((color) =>
        Boolean(color.availability[generation.years[0]].restriction),
      ),
    ),
    true,
  );
  assert.equal(
    qualifiedPalettes[0].sources["2022"].locator,
    "PDF pages 8, 10, 12, 14, 16, and 18, trim color strips.",
  );
  assert.match(
    qualifiedPalettes[0].colors.find(
      (color) => color.name === "Iridescent Pearl Tricoat",
    ).availability["2022"].restriction,
    /Unavailable on LS\.[\s\S]*Extra-cost color where offered\./,
  );
  assert.match(reviewed[0].sources["1995"].locator, /PDF p\. 18/);
  assert.match(reviewed[0].sources["1996"].revision, /1-29-96/);
  assert.match(reviewed[0].sources["1997"].locator, /PDF p\. 26/);
  assert.match(reviewed[0].sources["1998"].locator, /PDF p\. 55/);
  assert.match(reviewed[0].sources["1999"].locator, /PDF p\. 27/);
  assert.match(reviewed[0].revisionNote, /184 two-tone rows/);
  assert.match(reviewed[2].sources["2007"].locator, /PDF p\. 11/);
  assert.match(tahoe.status, /13 model years have complete source-linked palettes or exact program audits/);
});

test("Suburban 2008–2024 retains each audited Fleet Guide palette without code inference", async () => {
  const { models } = await loadArchiveData();
  const suburban = models.find((model) => model.id === "suburban");
  const qualifiedByYear = new Map(
    suburban.generations
      .filter((generation) =>
        Object.values(generation.sources).some(
          (source) => source.evidenceClass === "qualified_palette_union",
        ),
      )
      .flatMap((generation) => generation.years.map((year) => [year, generation])),
  );
  const expectedCounts = {
    2008: 8,
    2009: 9,
    2010: 10,
    2011: 10,
    2012: 8,
    2013: 10,
    2014: 8,
    2015: 8,
    2016: 10,
    2017: 9,
    2018: 10,
    2019: 9,
    2020: 8,
    2021: 9,
    2022: 10,
    2023: 10,
    2024: 9,
  };

  assert.deepEqual(
    Object.fromEntries(
      Object.keys(expectedCounts).map((year) => [year, qualifiedByYear.get(year)?.listingCount]),
    ),
    expectedCounts,
  );

  const colorFor = (year, name) =>
    qualifiedByYear.get(String(year)).colors.find((color) => color.name === name);
  assert.equal(colorFor(2008, "Graystone Metallic").rowCode, "16U");
  assert.equal(colorFor(2014, "White Diamond Tricoat").rowCode, "98U");
  assert.match(
    colorFor(2014, "White Diamond Tricoat").availability["2014"].restriction,
    /Premium paint; available at extra cost\.[\s\S]*LTZ only\./,
  );
  assert.equal(colorFor(2015, "Sable Metallic").rowCode, "G7U");
  assert.equal(colorFor(2018, "Satin Steel Metallic").rowCode, "G9K");
  for (let year = 2019; year <= 2024; year += 1) {
    assert.equal(
      qualifiedByYear
        .get(String(year))
        .colors.every((color) => color.rowCode === "not printed"),
      true,
      `${year} must not infer factory codes that the Fleet Guide does not print`,
    );
  }

  const source2014 = qualifiedByYear.get("2014").sources["2014"];
  assert.match(source2014.archiveUrl, /brochure-source-archive-v1\/2014-gm-fleet-car-truck-guide-mirror\.pdf$/);
  assert.match(source2014.url, /^https:\/\/xr793\.com\//);
  assert.equal(source2014.originalUrl, source2014.url);
  assert.equal(source2014.officialUrl, undefined);
  assert.equal(source2014.landingUrl, "https://www.gmfleet.com/resources/guides-and-manuals");
  assert.equal(source2014.sourceType, "fleet_guide_pdf");
  assert.match(
    qualifiedByYear.get("2016").sources["2016"].limitations.join(" "),
    /Suburban HD has a separate palette[\s\S]*not merged/,
  );
  assert.match(
    qualifiedByYear.get("2015").sources["2015"].limitations.join(" "),
    /Actual colors may vary[\s\S]*Not all colors available on all models/,
  );
  const source2024 = qualifiedByYear.get("2024").sources["2024"];
  assert.match(source2024.archiveUrl, /brochure-source-archive-v1\/2024-gm-fleet-guide-v3-mirror\.pdf$/);
  assert.match(source2024.url, /^https:\/\/xr793\.com\//);
  assert.equal(source2024.originalUrl, source2024.url);
  assert.equal(source2024.officialUrl, undefined);
  assert.match(source2024.historicalOfficialUrl, /2023MY%20GM%20Fleet%20Guide/);
});

test("earlier official brochure palette unions retain exact pages, restrictions, and citations", async () => {
  const [{ models }, sourceText] = await Promise.all([
    loadArchiveData(),
    readFile(
      new URL("data/sources/modern-chevrolet-color-source-candidates.json", root),
      "utf8",
    ),
  ]);
  const sourceData = JSON.parse(sourceText);
  const retainedSources = sourceData.sources.filter((source) => source.local_file_path);
  assert.equal(retainedSources.length, 23);
  assert.ok(
    retainedSources.every(
      (source) =>
        source.archive_asset_name &&
        source.archive_url ===
          `https://github.com/ipadmom/chevrolet-color-archive/releases/download/brochure-source-archive-v1/${source.archive_asset_name}`,
    ),
  );
  const expectedTables = new Map([
    ["chevrolet-ebrochure-us-2022-tahoe:2022:tahoe", [10, [8, 10, 12, 14, 16, 18]]],
    ["chevrolet-ebrochure-us-2023-colorado:2023:colorado", [8, [13, 15, 17, 19, 21]]],
    ["chevrolet-ebrochure-us-2023-silverado-hd-commercial:2023:silverado-hd", [9, [10]]],
    ["chevrolet-ebrochure-us-2023-silverado-4500-6500-hd:2023:silverado-4500-6500-hd", [12, [7]]],
  ]);
  for (const [tableId, [colorCount, pages]] of expectedTables) {
    const table = sourceData.verified_palette_tables.find(
      (candidate) => candidate.table_id === tableId,
    );
    assert.ok(table, `missing ${tableId}`);
    assert.equal(table.ingestion_status, "ready_palette_union");
    assert.equal(table.colors.length, colorCount);
    assert.deepEqual(table.pdf_pages, pages);
    assert.ok(Object.keys(table.color_restrictions).length > 0);
  }

  const colorado = models.find((model) => model.id === "colorado");
  const colorado2023 = colorado.generations.find((generation) =>
    generation.years.includes("2023"),
  );
  assert.equal(colorado2023.listingCount, 8);
  assert.equal(
    colorado2023.sources["2023"].locator,
    "PDF pages 13, 15, 17, 19, and 21, trim color strips.",
  );
  assert.match(
    colorado2023.sources["2023"].archiveUrl,
    /brochure-source-archive-v1\/2023-chevrolet-colorado-ebrochure\.pdf$/,
  );
  assert.match(colorado2023.sources["2023"].url, /^https:\/\/www\.chevrolet\.com\//);
  assert.equal(
    colorado2023.sources["2023"].originalUrl,
    colorado2023.sources["2023"].url,
  );
  assert.match(
    colorado2023.colors.find((color) => color.name === "Nitro Yellow Metallic")
      .availability["2023"].restriction,
    /Unavailable on WT and LT\.[\s\S]*Extra-cost color where offered\./,
  );

  const silverado = models.find((model) => model.id === "silverado-hd");
  const silverado2023 = silverado.generations.find((generation) =>
    generation.years.includes("2023"),
  );
  assert.equal(silverado2023.listingCount, 15);
  assert.equal(silverado2023.sources["2023"].locator, "PDF page 10, EXTERIOR COLORS.");
  assert.equal(silverado2023.sources["2023"].supportingSources.length, 1);
  assert.equal(
    silverado2023.sources["2023"].supportingSources[0].locator,
    "PDF page 7, EXTERIOR COLORS.",
  );
  const redHot = silverado2023.colors.find((color) => color.name === "Red Hot");
  assert.deepEqual(redHot.availability["2023"].sourceIds, [
    "chevrolet-ebrochure-us-2023-silverado-hd-commercial",
    "chevrolet-ebrochure-us-2023-silverado-4500-6500-hd",
  ]);
  assert.match(redHot.availability["2023"].restriction, /unavailable on High Country/);
  const deepOcean = silverado2023.colors.find(
    (color) => color.name === "Deep Ocean Blue Metallic",
  );
  assert.deepEqual(deepOcean.availability["2023"].sourceIds, [
    "chevrolet-ebrochure-us-2023-silverado-4500-6500-hd",
  ]);
  assert.match(deepOcean.availability["2023"].restriction, /extra-cost color/);
});

test("catalog exposes every recorded U.S. nameplate and model year", async () => {
  const [{ models }, catalogText] = await Promise.all([
    loadArchiveData(),
    readFile(new URL("data/catalog/chevrolet-us-nameplates.json", root), "utf8"),
  ]);
  const catalog = JSON.parse(catalogText);
  const tahoe = models.find((model) => model.id === "tahoe");
  const suburban = models.find((model) => model.id === "suburban");
  const tahoeYears = tahoe.generations.flatMap((generation) => generation.years);
  const suburbanYears = suburban.generations.flatMap((generation) => generation.years);

  assert.equal(catalog.models.length, 149);
  assert.equal(models.length, 149);
  assert.equal(new Set(catalog.models.map((model) => model.id)).size, 149);
  assert.equal(catalog.models.filter((model) => model.current).length, 18);
  assert.equal(models[0].id, "camaro");
  assert.deepEqual([...new Set(tahoeYears)], numericRangeForTest(1995, 2026));
  assert.equal(new Set(tahoeYears).size, 32);
  assert.equal(suburbanYears[0], "1935");
  assert.equal(suburbanYears.at(-1), "2026");
  assert.ok(!suburbanYears.includes("1943"));
  assert.ok(!suburbanYears.includes("1944"));
  assert.ok(!suburbanYears.includes("1945"));
  assert.ok(suburbanYears.includes("1977"));
  assert.ok(
    tahoe.generations
      .flatMap((generation) => generation.catalogSources ?? [])
      .some((url) => url === "https://www.chevrolet.com/vehicles"),
  );
  assert.ok(models.every((model) => model.generations.length > 0));
  assert.ok(
    catalog.models
      .flatMap((model) => model.model_year_ranges)
      .flatMap((range) => range.evidence_urls)
      .every((url) => url.startsWith("https://")),
  );
});

function numericRangeForTest(start, end) {
  return Array.from({ length: end - start + 1 }, (_, index) => String(start + index));
}

test("Chevelle restrictions, exclusions, normalization, and sources are explicit", async () => {
  const { models } = await loadArchiveData();
  const generation = models.find((model) => model.id === "chevelle").generations[0];
  const color = (id) =>
    generation.colors.find((entry) => entry.id === id);

  for (const id of [
    "chevelle-glacier-gray-1965",
    "chevelle-crocus-yellow-1965",
    "chevelle-evening-orchid-1965",
  ]) {
    assert.equal(color(id).availability["1965"].state, "restricted");
    assert.equal(
      color(id).availability["1965"].restriction,
      "Malibu S.S. only",
    );
  }
  assert.equal(
    generation.colors.filter(
      (entry) => entry.availability["1965"]?.state === "restricted",
    ).length,
    3,
  );
  assert.deepEqual(
    color("chevelle-tuxedo-black-1964").availability,
    {
      1964: { state: "listed", label: "Tuxedo Black", code: "900" },
      1965: { state: "listed", label: "Tuxedo Black", code: "AA" },
      1966: { state: "listed", label: "Tuxedo Black", code: "AA" },
    },
  );
  assert.equal(
    color("chevelle-danube-blue-1965").availability["1967"],
    undefined,
  );
  assert.equal(
    color("chevelle-dk-blue-1967").availability["1967"].code,
    "EE",
  );
  assert.equal(
    generation.colors.some((entry) => /Goldwood Yellow/i.test(entry.name)),
    false,
  );
  assert.equal(
    generation.colors.some((entry) => entry.name.includes("/")),
    false,
  );

  const exactLocators = {
    1964: "PDF pp. 26–27, printed BODY-3 and 4-BODY",
    1965: "PDF pp. 35–36, printed Section II, pp. 21–22",
    1966: "PDF pp. 40–41, printed BODY-3–4",
    1967: "PDF pp. 48–52, printed BODY-3–7",
  };
  for (const [year, locator] of Object.entries(exactLocators)) {
    assert.equal(generation.sources[year].locator, locator);
    assert.match(
      generation.sources[year].url,
      new RegExp(`${year}-Chevrolet-Chevelle\\.pdf$`),
    );
  }

  const audit = await readFile(
    new URL("docs/source-audit-chevelle-1964-1967.md", root),
    "utf8",
  );

  function documentedSolidRows(year) {
    const start = audit.indexOf(`## ${year}`);
    assert.notEqual(start, -1, `missing ${year} audit section`);
    const next = audit.indexOf("\n## ", start + 4);
    const section = audit.slice(start, next === -1 ? undefined : next);
    return [
      ...section.matchAll(
        /^\| ([^|\r\n]+) \| ([^|\r\n]+) \| (Listed|Restricted[^|\r\n]*) \|\r?$/gm,
      ),
    ]
      .map((match) => [
        match[1].trim(),
        match[2].trim(),
        match[3].startsWith("Restricted") ? "restricted" : "listed",
      ])
      .sort((left, right) => left.join("\0").localeCompare(right.join("\0")));
  }

  for (const year of generation.years) {
    const actual = generation.colors
      .filter((entry) => entry.availability[year])
      .map((entry) => [
        entry.availability[year].code,
        entry.availability[year].label,
        entry.availability[year].state,
      ])
      .sort((left, right) => left.join("\0").localeCompare(right.join("\0")));
    assert.deepEqual(actual, documentedSolidRows(year));
  }

  assert.match(audit, /943 Goldwood Yellow[\s\S]*remains unverified/);
  assert.match(audit, /Audited two-tone inventory/);
  assert.match(audit, /\| 952 \| Dk\. Green \/ Med\. Green \|/);
  assert.match(audit, /\| HC \| Willow Green \/ Ermine White \| Unavailable/);
});

test("generation overlaps are limited to explicit specialty-program rows", async () => {
  const { models } = await loadArchiveData();
  const overlaps = [];

  for (const model of models) {
    const generationsByYear = new Map();
    for (const generation of model.generations) {
      for (const year of generation.years) {
        const matches = generationsByYear.get(year) || [];
        matches.push(generation);
        generationsByYear.set(year, matches);
      }
    }
    for (const [year, generations] of generationsByYear) {
      if (generations.length === 1) continue;
      if (
        model.id === "tahoe" &&
        year === "2000" &&
        generations.every((generation) => generation.id.startsWith("tahoe-2000-"))
      ) {
        assert.deepEqual(
          generations.map((generation) => generation.listingCount),
          [9, 5, 1, 4],
        );
        overlaps.push(`${model.id}:${year}`);
        continue;
      }
      const evidenceClasses = generations.map(
        (generation) => generation.sources[year]?.evidenceClass,
      );
      const incompleteSubsetClasses = new Set([
        "specialty_palette_subset",
        "qualified_historical_table",
      ]);
      assert.ok(
        evidenceClasses.some((value) => incompleteSubsetClasses.has(value)),
        `${model.name} ${year} overlap lacks an explicit subset`,
      );
      const subsetOnly = evidenceClasses.every((value) =>
        incompleteSubsetClasses.has(value),
      );
      if (!subsetOnly) {
        assert.ok(
          evidenceClasses.some((value) => !incompleteSubsetClasses.has(value)),
          `${model.name} ${year} overlap lacks a governing generation`,
        );
      }
      overlaps.push(`${model.id}:${year}`);
    }
  }
  assert.deepEqual(overlaps, [
    "blazer:1979",
    "blazer:1980",
    "blazer-ev:2026",
    "bolt-euv:2023",
    "ck-series:1979",
    "ck-series:1980",
    "ck-series:1983",
    "ck-series:1993",
    "caprice-ppv:2011",
    "caprice-ppv:2012",
    "caprice-ppv:2013",
    "caprice-ppv:2014",
    "caprice-ppv:2015",
    "caprice-ppv:2016",
    "caprice-ppv:2017",
    "express:2012",
    "express:2013",
    "express:2014",
    "g-series-van:1979",
    "g-series-van:1980",
    "g-series-van:1981",
    "impala:2011",
    "impala:2012",
    "impala:2013",
    "impala-limited:2014",
    "impala-limited:2015",
    "impala-limited:2016",
    "s10:1993",
    "silverado:2012",
    "silverado:2014",
    "silverado:2026",
    "sportvan:1979",
    "sportvan:1980",
    "suburban:1979",
    "suburban:1980",
    "suburban:2005",
    "suburban:2007",
    "suburban:2011",
    "suburban:2012",
    "suburban:2013",
    "suburban:2014",
    "suburban:2019",
    "suburban:2020",
    "tahoe:2000",
    "tahoe:2003",
    "tahoe:2005",
    "tahoe:2006",
    "tahoe:2012",
    "tahoe:2013",
    "tahoe:2014",
    "tahoe:2015",
    "tahoe:2016",
    "tahoe:2017",
    "tahoe:2018",
    "tahoe:2019",
    "tahoe:2020",
  ]);
});

test("verified specialty paint subsets preserve exact labels, codes, scope, and sources", async () => {
  const [{ models }, specialtySourceText] = await Promise.all([
    loadArchiveData(),
    readFile(
      new URL("data/sources/specialty-color-source-candidates.json", root),
      "utf8",
    ),
  ]);
  const specialty = JSON.parse(specialtySourceText);
  const publishedSpecialty = specialty.app_publication_records.filter(
    (record) => record.publication_status === "published_specialty_subset",
  );
  const publishedQualifiedHistorical = specialty.app_publication_records.filter(
    (record) =>
      record.publication_status === "published_qualified_historical_subset",
  );

  assert.equal(specialty.visibility, "public");
  assert.equal(specialty.dataset_kind, "chevrolet_color_source_candidates");
  assert.equal(specialty.app_publication_records.length, 533);
  assert.equal(publishedSpecialty.length, 529);
  assert.equal(publishedQualifiedHistorical.length, 4);
  assert.equal(specialty.integrity_audit.unique_retained_artifacts_reconciled, 87);
  assert.equal(specialty.integrity_audit.last_updater_rehash.file_count, 11);
  assert.deepEqual(specialty.integrity_audit.artifact_reference_groups, {
    published_record_sources: 32,
    published_specialty_sources: 30,
    published_qualified_historical_sources: 2,
    verified_not_published_sources: 4,
    historic_gm_upfitter_candidates: 36,
    usda_primary_sources: 6,
    modern_order_guide_snapshot_candidates: 24,
    comparison_sources: 2,
    rejected_or_unresolved_source_artifacts: 2,
  });
  assert.ok(
    specialty.app_publication_records.every(
      (record) =>
        record.source.url.startsWith("https://") &&
        record.source.archive_url?.startsWith(
          "https://github.com/ipadmom/chevrolet-color-archive/releases/download/brochure-source-archive-v1/",
        ) &&
        /^[0-9a-f]{64}$/.test(record.source.sha256) &&
        record.source.bytes > 0 &&
        (record.source.pdf_page || record.source.pdf_pages?.length) &&
        record.restrictions.length > 0,
    ),
  );
  assert.ok(
    specialty.app_publication_records.every(
      (record) => !["Forest Service Green", "Forestry Green"].includes(record.label),
    ),
  );

  const tahoeSpecialty = specialty.app_publication_records.filter(
    (record) => record.catalog_model_ids.includes("tahoe") && [2003, 2005, 2006].includes(record.model_year),
  );
  assert.deepEqual(
    Object.fromEntries(
      [2003, 2005, 2006].map((year) => [
        year,
        tahoeSpecialty.filter((record) => record.model_year === year).length,
      ]),
    ),
    { 2003: 4, 2005: 5, 2006: 5 },
  );
  assert.deepEqual(
    tahoeSpecialty.filter((record) => record.model_year === 2003).map((record) => record.label).sort(),
    ["Doeskin Tan", "Tangier Orange", "Wheatland Yellow", "Woodland Green"],
  );
  assert.equal(
    tahoeSpecialty.some(
      (record) => record.model_year === 2005 && record.label === "Tangier Orange",
    ),
    false,
  );

  const expected = [
    ["ck-series", "1980", "46 / SEO 9V5"],
    ["blazer", "1980", "46 / SEO 9V5"],
    ["suburban", "1980", "46 / SEO 9V5"],
    ["tahoe", "2003", "WA-9015 / SEO 9V5"],
    ["tahoe", "2005", "SEO 9V5"],
    ["tahoe", "2006", "SEO 9V5"],
    ["tahoe", "2011", "WA-9015 / SEO 9V5"],
    ["express", "2011", "WA-9015 / SEO 9V5"],
    ["suburban", "2011", "WA-9015 / SEO 9V5"],
    ["silverado-hd", "2011", "WA-9015 / SEO 9V5"],
  ];
  for (const [modelId, year, code] of expected) {
    const model = models.find((candidate) => candidate.id === modelId);
    const generation = model?.generations.find(
      (candidate) =>
        candidate.years.includes(year) &&
        candidate.sources[year]?.evidenceClass ===
          "specialty_palette_subset" &&
        candidate.colors.some(
          (color) => color.availability[year]?.label === "Woodland Green",
        ),
    );
    const color = generation?.colors.find(
      (candidate) => candidate.availability[year]?.label === "Woodland Green",
    );
    assert.ok(color, `${modelId} ${year} Woodland Green is published`);
    assert.equal(color.availability[year].code, code);
    assert.equal(
      generation.sources[year].evidenceClass,
      "specialty_palette_subset",
    );
    assert.match(
      generation.sources[year].archiveUrl,
      /releases\/download\/brochure-source-archive-v1\//,
    );
    assert.match(generation.sources[year].originalUrl, /^https:\/\//);
    assert.match(generation.revisionNote, /not a complete model-year exterior-color palette/);
  }

  const modernSnapshots = specialty.modern_order_guide_snapshot_candidates;
  assert.equal(modernSnapshots.length, 24);
  assert.ok(
    modernSnapshots.every(
      (snapshot) =>
        snapshot.page > 0 &&
        snapshot.retrieved_at.endsWith("Z") &&
        snapshot.bytes > 0 &&
        /^[0-9a-f]{64}$/.test(snapshot.sha256),
    ),
  );
});

test("1981 historical chart rows and 1983 permanent-fleet SEO rows remain distinct", async () => {
  const { models } = await loadArchiveData();
  const historical = models.flatMap((model) =>
    model.generations
      .filter(
        (generation) =>
          generation.years.includes("1981") &&
          generation.sources["1981"]?.evidenceClass ===
            "qualified_historical_table",
      )
      .map((generation) => ({ model, generation })),
  );
  assert.deepEqual(
    historical.map(({ model }) => model.id).sort(),
    ["g-series-van", "g-series-van", "p-series-step-van", "sportvan"],
  );
  assert.ok(
    historical.every(({ generation }) =>
      generation.revisionNote.includes(
        "exact, qualified subset from the standard exterior-color table",
      ),
    ),
  );
  assert.ok(
    historical.every(({ generation }) => !/specialty paint/i.test(generation.label)),
  );
  assert.ok(
    historical.every(({ generation }) => {
      const availability = generation.colors[0].availability["1981"];
      return (
        availability.applicationType === "standard_program_palette" &&
        availability.factoryInstallationClaim === false &&
        availability.seoCode === null
      );
    }),
  );

  const ck = models.find((model) => model.id === "ck-series");
  const permanentFleet = ck.generations.filter(
    (generation) =>
      generation.years.includes("1983") &&
      generation.sources["1983"]?.evidenceClass === "specialty_palette_subset" &&
      generation.programId === "gm-1983-ck-pickup-permanent-fleet-colors",
  );
  assert.equal(permanentFleet.length, 4);
  assert.deepEqual(
    permanentFleet
      .map((generation) => generation.colors[0].availability["1983"].seoCode)
      .sort(),
    ["9V2", "9V4", "9V5", "9V8"],
  );
  assert.ok(
    permanentFleet.every(
      (generation) =>
        generation.colors[0].availability["1983"].factoryInstallationClaim ===
        false,
    ),
  );
});

test("legacy Camaro manifest aliases resolve into the 691-source official corpus", async () => {
  const [indexManifestText, supplementalManifestText] = await Promise.all([
    readFile(
      new URL("crawler/manifests/gm-heritage-chevrolet-all.jsonl", root),
      "utf8",
    ),
    readFile(
      new URL("crawler/manifests/gm-heritage-camaro-1967-1969.jsonl", root),
      "utf8",
    ),
  ]);
  const parseManifest = (text) =>
    text
      .trim()
      .split(/\r?\n/)
      .map((line) => JSON.parse(line));
  const indexRecords = parseManifest(indexManifestText);
  const supplementalRecords = parseManifest(supplementalManifestText);

  assert.equal(indexRecords.length, 691);
  assert.equal(supplementalRecords.length, 3);
  assert.equal(new Set(indexRecords.map((record) => record.source_id)).size, 691);
  assert.equal(new Set(indexRecords.map((record) => record.canonical_url)).size, 691);
  assert.ok(indexRecords.every((record) => record.officiality === "official"));
  assert.ok(indexRecords.every((record) => record.make === "Chevrolet"));
  assert.deepEqual(
    supplementalRecords.map((record) => record.year_start),
    [1967, 1968, 1969],
  );
  for (const alias of supplementalRecords) {
    const canonical = indexRecords.find(
      (record) => record.canonical_url === alias.canonical_url,
    );
    assert.ok(canonical, `${alias.source_id} lacks a canonical index record`);
    assert.notEqual(canonical.source_id, alias.source_id);
    assert.equal(canonical.title, alias.title);
    assert.equal(canonical.model, alias.model);
    assert.equal(canonical.year_start, alias.year_start);
    assert.equal(canonical.year_end, alias.year_end);
  }
  assert.ok(indexRecords.some((record) => record.model === "Tahoe"));
  assert.ok(indexRecords.some((record) => record.model === "Suburban"));
  assert.ok(indexRecords.some((record) => record.year_start === 1913));
  assert.ok(indexRecords.some((record) => record.year_end === 2007));
});

test("production shell follows the Import Archive research flow", async () => {
  const [page, layout, explorer, styles, packageJson] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/layout.tsx", root), "utf8"),
    readFile(new URL("app/archive-explorer.tsx", root), "utf8"),
    readFile(new URL("app/globals.css", root), "utf8"),
    readFile(new URL("package.json", root), "utf8"),
  ]);

  assert.match(page, /ArchiveExplorer/);
  assert.match(layout, /Chevrolet Color Archive/);
  assert.match(explorer, /Choose a model/);
  assert.match(explorer, /Choose a year/);
  assert.match(explorer, /CURRENT MODELS/);
  assert.match(explorer, /DISCONTINUED BEFORE 1970/);
  assert.doesNotMatch(explorer, /Chevrolet Models \(USA, all model years\)/);
  assert.match(explorer, /UNVERIFIED/);
  assert.match(explorer, /color timeline/);
  assert.match(explorer, /CLAIM-LEVEL EVIDENCE/);
  assert.match(explorer, /<dt>Document<\/dt>/);
  assert.match(explorer, /<dt>Publisher<\/dt>/);
  assert.match(explorer, /<dt>Carrier<\/dt>/);
  assert.match(explorer, /ORIGINAL SOURCE URL/);
  assert.match(explorer, /OPEN RETAINED SOURCE/);
  assert.match(explorer, /OPEN SOURCE REFERENCE/);
  assert.match(explorer, /source\.originalUrl/);
  assert.match(explorer, /ARCHIVAL RETRIEVAL URL/);
  assert.match(explorer, /STAGE PHOTOGRAPH/);
  assert.match(explorer, /not evidence of[\s\S]*factory paint or original finish/);
  assert.match(explorer, /They never prove factory[\s\S]*availability or original paint/);
  assert.match(explorer, /photo\.attribution/);
  assert.match(explorer, /photo\.sourceUrl/);
  assert.match(explorer, /photo\.licenseUrl/);
  assert.match(explorer, /photo\.archiveOriginalUrl/);
  assert.match(explorer, /buildArchiveMatrix\(model, year\)/);
  assert.match(explorer, /sourceColorIdsByYear/);
  assert.match(explorer, /generationForRecord\(model, year, colorId\)/);
  assert.match(explorer, /archiveListingCount/);
  assert.match(explorer, /archiveModelYearCount/);
  assert.match(styles, /\.ia-topbar[\s\S]*height:\s*50px/);
  assert.match(styles, /\.ia-sidebar[\s\S]*width:\s*350px/);
  assert.match(styles, /\.ia-content[\s\S]*max-width:\s*576px/);
  assert.match(styles, /\.colorchartmain[\s\S]*width:\s*542px/);
  assert.match(styles, /@media \(max-width:\s*942px\)/);
  assert.doesNotMatch(explorer, /<strong>48<\/strong>/);
  assert.doesNotMatch(explorer, /The color archive Chevrolet never built/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  await assert.rejects(access(new URL("app/_sites-preview/SkeletonPreview.tsx", root)));
});

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
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

test("Camaro second generation preserves complete charts and generation order", async () => {
  const { models } = await loadArchiveData();
  const camaro = models.find((model) => model.id === "camaro");
  const generation = camaro.generations[1];

  assert.deepEqual(
    camaro.generations.map((item) => item.range),
    ["1967–1969", "1970–1981", "1982–1992"],
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

test("Camaro photo references preserve review status, rights, and published bytes", async () => {
  const { staticPhotoCandidates } = await loadArchiveData();
  const reviewedIds = new Set([
    "commons-1976-camaro-silver-f880311b",
    "commons-1980-camaro-red-69ba1917",
  ]);
  const heldIds = new Set([
    "commons-1979-camaro-blue-09e19346",
    "commons-1981-camaro-black-cc3ffcaf",
  ]);
  const published = staticPhotoCandidates.filter(
    (photo) => reviewedIds.has(photo.id) || heldIds.has(photo.id),
  );

  assert.equal(published.length, 4);
  for (const photo of published) {
    assert.equal(photo.status, reviewedIds.has(photo.id) ? "reviewed" : "candidate");
    assert.match(photo.src, /^\/vehicle-photos\/assets\/[a-f0-9]{64}\.jpg$/);
    assert.match(photo.sourceUrl, /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
    assert.ok(photo.note);
  }
  assert.equal(
    published.find((photo) => photo.id === "commons-1979-camaro-blue-09e19346")
      .note.includes("unverified visual classification"),
    true,
  );

  const manifest = JSON.parse(
    await readFile(new URL("public/vehicle-photos/attribution.json", root), "utf8"),
  );
  assert.equal(manifest.schemaVersion, 2);
  assert.equal(manifest.assets.length, 4);
  assert.equal(manifest.publications.length, 4);
  for (const asset of manifest.assets) {
    const bytes = await readFile(new URL(asset.path, root));
    assert.equal(bytes.length, asset.bytes);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), asset.sha256);
    assert.equal(asset.sanitizer.name, "privacy-metadata-strip");
    assert.equal(asset.sanitizer.version, 2);
  }
  assert.deepEqual(
    manifest.publications
      .filter((publication) => publication.candidate.status === "reviewed")
      .map((publication) => publication.selection.year)
      .sort(),
    ["1976", "1980"],
  );
  assert.equal(
    manifest.publications.every(
      (publication) =>
        publication.rightsReview.decision === "approve" &&
        publication.rightsReview.reviewedOriginalUrl ===
          publication.candidate.originalUrl,
    ),
    true,
  );
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
  assert.equal(
    models
      .flatMap((model) => model.generations)
      .reduce((total, item) => total + item.listingCount, 0),
    448,
  );
});

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

test("each published model year resolves to exactly one generation", async () => {
  const { models } = await loadArchiveData();

  for (const model of models) {
    const years = model.generations.flatMap((generation) => generation.years);
    assert.equal(
      new Set(years).size,
      years.length,
      `${model.name} repeats a year across generations`,
    );
  }
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
  assert.match(explorer, /color timeline/);
  assert.match(explorer, /CLAIM-LEVEL EVIDENCE/);
  assert.match(explorer, /STAGE PHOTOGRAPH/);
  assert.match(explorer, /model\.generations\.flatMap/);
  assert.match(explorer, /item\.years\.includes\(year\)/);
  assert.match(explorer, /archiveListingCount/);
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

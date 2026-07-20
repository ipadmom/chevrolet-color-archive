import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { normalizeCommonsPage } from "../commons.mjs";
import {
  emptyManifest,
  mergeDiscovery,
  recordIdFor,
} from "../manifest.mjs";
import { evaluateRights, htmlToText } from "../rights.mjs";

const fixtureUrl = new URL("../fixtures/commons-search.json", import.meta.url);
const fixture = JSON.parse(await readFile(fixtureUrl, "utf8"));
const context = {
  make: "Chevrolet",
  model: "Camaro",
  year: "1969",
  color: "Hugger Orange",
  generation: "1967-1969",
};

test("normalizes HTML and recognizes the conservative rights allowlist", () => {
  assert.equal(htmlToText("<b>Alice &amp; Bob</b>"), "Alice & Bob");
  assert.deepEqual(evaluateRights({ shortName: "CC BY-SA 4.0" }), {
    status: "rights-clear",
    downloadAllowed: true,
    reason:
      "The license metadata identifies a public-domain, CC0, CC BY, or CC BY-SA work.",
  });
  assert.equal(
    evaluateRights({ shortName: "CC BY-NC 4.0" }).downloadAllowed,
    false,
  );
  assert.equal(evaluateRights({ shortName: "GFDL" }).status, "manual-review");
  assert.equal(evaluateRights({}).status, "manual-review");
});

test("normalizes Commons metadata with attribution, rights, and context", () => {
  const candidate = normalizeCommonsPage({
    page: fixture.query.pages[0],
    context,
    searchQuery: "1969 Chevrolet Camaro Hugger Orange",
    retrievedAt: "2026-07-20T00:00:00.000Z",
    rawSourceRef: "raw/example.json",
  });

  assert.equal(candidate.originalPageUrl, fixture.query.pages[0].fullurl);
  assert.equal(candidate.creator.display, "Alice Example");
  assert.equal(candidate.license.shortName, "CC BY-SA 4.0");
  assert.equal(candidate.rights.downloadAllowed, true);
  assert.deepEqual(candidate.dimensions, { width: 2400, height: 1600 });
  assert.deepEqual(candidate.context, context);
  assert.deepEqual(candidate.rawSourceRefs, ["raw/example.json"]);
});

test("deduplicates deterministically by Commons SHA-1 and keeps query provenance", () => {
  const normalized = fixture.query.pages.slice(0, 2).map((page, index) =>
    normalizeCommonsPage({
      page,
      context,
      searchQuery:
        index === 0
          ? "1969 Chevrolet Camaro Hugger Orange"
          : "Camaro orange 1969",
      retrievedAt: "2026-07-20T00:00:00.000Z",
      rawSourceRef: `raw/page-${index + 1}.json`,
    }),
  );
  const manifest = emptyManifest("2026-07-20T00:00:00.000Z");
  const record = mergeDiscovery({
    manifest,
    context,
    candidates: normalized,
    rawResponseFiles: ["raw/page-1.json", "raw/page-2.json"],
    now: "2026-07-20T00:00:00.000Z",
  });

  assert.equal(record.recordId, recordIdFor(context));
  assert.equal(record.candidates.length, 1);
  assert.deepEqual(record.candidates[0].searchQueries, [
    "1969 Chevrolet Camaro Hugger Orange",
    "Camaro orange 1969",
  ]);
  assert.deepEqual(record.candidates[0].rawSourceRefs, [
    "raw/page-1.json",
    "raw/page-2.json",
  ]);
  assert.equal(manifest.factoryPaintEvidence, false);
  assert.match(manifest.disclaimer, /does not prove/i);
});


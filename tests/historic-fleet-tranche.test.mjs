import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const updaterUrl = new URL(
  "scripts/update-1981-1983-historic-fleet-tranche.mjs",
  root,
);

const retainedSources = [
  {
    path: "tmp/crawler-state/objects/sha256/9a/fb/9afb28d13caca261b3cc2f493b353c2d79e2c678c8e67de2906906ec5229a317.pdf",
    bytes: 2_028_295,
    sha256: "9afb28d13caca261b3cc2f493b353c2d79e2c678c8e67de2906906ec5229a317",
  },
  {
    path: "tmp/crawler-state/objects/sha256/ea/5a/ea5aa8b61c7975cf814e56518293f870b46a390f4db5b33d3428eb2d38d655c9.pdf",
    bytes: 11_196_101,
    sha256: "ea5aa8b61c7975cf814e56518293f870b46a390f4db5b33d3428eb2d38d655c9",
  },
  {
    path: "tmp/specialty-color-sources/gm-truck-kits/1983-Chevrolet-Truck.pdf",
    bytes: 6_802_994,
    sha256: "4e8b447e6617d7be8b9c56fa4ef6e1e5e62918c8d8d45c5abc71f74e5ee04ce1",
  },
];

test("historic fleet updater pins all retained primary-source bytes", async () => {
  for (const source of retainedSources) {
    const fileUrl = new URL(source.path, root);
    const [bytes, metadata] = await Promise.all([readFile(fileUrl), stat(fileUrl)]);
    assert.equal(metadata.size, source.bytes, source.path);
    assert.equal(
      createHash("sha256").update(bytes).digest("hex"),
      source.sha256,
      source.path,
    );
  }
});

test("historic fleet updater is a static, fail-closed eight-row tranche", async () => {
  const text = await readFile(updaterUrl, "utf8");
  const catalog = JSON.parse(
    await readFile(new URL("data/catalog/chevrolet-us-nameplates.json", root), "utf8"),
  );

  for (const id of ["sportvan", "g-series-van", "p-series-step-van", "ck-series"]) {
    assert.ok(catalog.models.some((model) => model.id === id), id);
  }

  for (const recordId of [
    "gm-1981-sportvan-woodland-green-46",
    "gm-1981-chevy-van-woodland-green-46",
    "gm-1981-cutaway-hi-cube-woodland-green-46",
    "gm-1981-step-van-step-van-king-woodland-green-46",
    "gm-1983-ck-pickup-permanent-fleet-tangier-orange-9v2",
    "gm-1983-ck-pickup-permanent-fleet-wheatland-yellow-9v4",
    "gm-1983-ck-pickup-permanent-fleet-woodland-green-9v5",
    "gm-1983-ck-pickup-permanent-fleet-cardinal-red-9v8",
  ]) {
    assert.ok(text.includes(recordId), recordId);
  }

  for (const literal of [
    "ZY1",
    "ZY2",
    "Bare Aluminum",
    'secondary_code: "02"',
    "Not available on S-10/15, El Camino/Caballero models.",
    'paint_code: "Not printed"',
    'factory_installation_claim: false',
    "Federal Standard No. 595 No. 14260",
    "Forest Service Green 5032",
  ]) {
    assert.ok(text.includes(literal), literal);
  }

  assert.doesNotMatch(text, /label:\s*["']Forest Service Green["']/);
  assert.equal(
    text.match(/publication_status: "published_qualified_historical_subset"/g)
      ?.length,
    4,
  );
  assert.match(text, /records1981\.length !== 4/);
  assert.match(text, /records1983\.length !== 4/);
  assert.match(text, /upsertStable\(/);
  assert.match(text, /source-sha256-manifest\.txt/);
  assert.match(text, /orderedReleaseEntries/);
  assert.match(text, /checksumEntry\.sha256 = createHash\("sha256"\)/);
  assert.ok(
    text.indexOf("manifest.scope.includes(historicScopeFragment)") <
      text.indexOf("manifest.scope.includes(oldScopeFragment)"),
  );
  assert.doesNotMatch(text, /startsWith\(["']gm-198[13]/);
});

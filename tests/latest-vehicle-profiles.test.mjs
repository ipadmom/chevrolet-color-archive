import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const root = new URL("../", import.meta.url);

async function loadProfileModule() {
  const source = await readFile(
    new URL("app/latest-vehicle-profile-specs.ts", root),
    "utf8",
  );
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: "latest-vehicle-profile-specs.ts",
  }).outputText;
  return import(
    `data:text/javascript;base64,${Buffer.from(output).toString("base64")}`
  );
}

test("every current Chevrolet model has a dedicated latest-generation profile", async () => {
  const [{ models }, { latestVehicleProfileSpecs }] = await Promise.all([
    JSON.parse(
      await readFile(
        new URL("data/catalog/chevrolet-us-nameplates.json", root),
        "utf8",
      ),
    ),
    loadProfileModule(),
  ]);
  const currentModels = models.filter((model) => model.current);

  assert.equal(currentModels.length, 18);
  assert.deepEqual(
    Object.keys(latestVehicleProfileSpecs).sort(),
    currentModels.map(({ id }) => id).sort(),
  );

  for (const model of currentModels) {
    const latestYear = Math.max(
      ...model.model_year_ranges.map(({ end }) => end),
    );
    const spec = latestVehicleProfileSpecs[model.id];

    assert.equal(
      spec.representativeYear,
      latestYear,
      `${model.id} must depict its latest catalog year`,
    );
    assert.ok(
      spec.startYear <= latestYear && latestYear <= spec.endYear,
      `${model.id} latest generation must contain ${latestYear}`,
    );
    assert.equal(spec.referenceUrl.startsWith("https://www.chevrolet.com/"), true);
    assert.ok(spec.representativeVariant.length >= 8);
    assert.match(spec.bodyPath, /^M /);
    assert.ok(
      (spec.bodyPath.match(/[LQ]/g) ?? []).length >= 6,
      `${model.id} outer silhouette needs at least six line or curve segments`,
    );
    assert.ok(spec.glassPaths.length >= 2);
    assert.ok(spec.frontWheelX - spec.rearWheelX >= 95);
    const renderedWheelbaseRatio =
      (spec.frontWheelX - spec.rearWheelX) /
      (spec.bodyFrontX - spec.bodyRearX);
    assert.ok(
      Math.abs(renderedWheelbaseRatio - spec.targetWheelbaseRatio) <= 0.015,
      `${model.id} wheelbase ratio ${renderedWheelbaseRatio.toFixed(3)} must track official ${spec.targetWheelbaseRatio.toFixed(3)}`,
    );
    assert.ok(spec.frontLampPath.length >= 20);
    assert.ok(spec.rearLampPath.length >= 20);
  }
});

test("every current profile has page-level official illustration and dimension evidence", async () => {
  const [{ models }, references, { latestVehicleProfileSpecs }] =
    await Promise.all([
      JSON.parse(
        await readFile(
          new URL("data/catalog/chevrolet-us-nameplates.json", root),
          "utf8",
        ),
      ),
      JSON.parse(
        await readFile(
          new URL(
            "data/catalog/chevrolet-current-profile-references.json",
            root,
          ),
          "utf8",
        ),
      ),
      loadProfileModule(),
    ]);

  const currentIds = models
    .filter((model) => model.current)
    .map(({ id }) => id)
    .sort();
  const referenceIds = references.records
    .map(({ model_id }) => model_id)
    .sort();

  assert.equal(references.schema_version, 2);
  assert.equal(references.record_count, 18);
  assert.deepEqual(referenceIds, currentIds);
  assert.equal(
    references.fleet_guide.retained_url,
    "https://github.com/ipadmom/chevrolet-color-archive/releases/download/brochure-source-archive-v1/2026-gm-fleet-guide-r2026-04-01.pdf",
  );
  assert.equal(references.fleet_guide.pdf_page_count, 184);
  assert.match(references.fleet_guide.sha256, /^[0-9a-f]{64}$/);

  for (const reference of references.records) {
    const spec = latestVehicleProfileSpecs[reference.model_id];
    assert.equal(reference.profile_id, spec.profileId);
    assert.equal(reference.representative_year, spec.representativeYear);
    assert.equal(
      reference.representative_variant,
      spec.representativeVariant,
    );
    assert.equal(reference.official_product_page_url, spec.referenceUrl);
    assert.ok(reference.fleet_guide_page.pdf_page >= 1);
    assert.ok(reference.fleet_guide_page.pdf_page <= 184);
    assert.ok(reference.fleet_guide_page.heading.length >= 12);
    assert.ok(
      Object.keys(reference.fleet_guide_page.published_measurements).length >=
        2,
    );
  }

  const fleetGuideWheelbaseGaps = references.records.filter(
    ({ fleet_guide_page }) =>
      !Object.hasOwn(fleet_guide_page.published_measurements, "wheelbase_in"),
  );
  assert.deepEqual(
    fleetGuideWheelbaseGaps.map(({ model_id }) => model_id).sort(),
    [
      "blazer",
      "blazer-ev",
      "corvette",
      "equinox",
      "equinox-ev",
      "suburban",
      "tahoe",
      "trailblazer",
      "traverse",
      "trax",
    ],
  );

  const allowedGeometryHosts = new Set([
    "cdn.dealereprocess.org",
    "eog-api.musea2.azure.ext.gm.com",
    "media.chevrolet.com",
    "news.chevrolet.com",
    "www.chevrolet.com",
  ]);
  for (const reference of fleetGuideWheelbaseGaps) {
    const geometry = reference.geometry_dimension_source;
    const spec = latestVehicleProfileSpecs[reference.model_id];
    assert.ok(geometry, `${reference.model_id} needs a wheelbase authority`);
    assert.ok(geometry.source_id.length >= 12);
    assert.equal(
      allowedGeometryHosts.has(new URL(geometry.source_url).hostname),
      true,
      `${reference.model_id} geometry source host must be explicitly reviewed`,
    );
    assert.ok(geometry.section.length >= 10);
    assert.equal(typeof geometry.same_generation_carryover, "boolean");
    assert.ok(geometry.published_measurements.wheelbase_in > 100);
    assert.ok(geometry.published_measurements.overall_length_in > 170);
    const sourceRatio =
      geometry.published_measurements.wheelbase_in /
      geometry.published_measurements.overall_length_in;
    assert.ok(
      Math.abs(sourceRatio - spec.targetWheelbaseRatio) <= 0.002,
      `${reference.model_id} target ${spec.targetWheelbaseRatio.toFixed(3)} must derive from cited ${sourceRatio.toFixed(3)}`,
    );
    if (geometry.source_id.startsWith("gm-online-order-guide-pdf-")) {
      assert.match(
        geometry.archive_url,
        /^https:\/\/github\.com\/ipadmom\/chevrolet-color-archive\/releases\/download\/current-order-guide-source-archive-v1\//,
      );
    }
  }

  assert.deepEqual(
    references.specialty_supplement.map(({ pdf_page }) => pdf_page),
    [156, 157, 158, 159, 160],
  );
});

test("latest-profile selection catalog covers all Chevrolet nameplates without inventing resolved variants", async () => {
  const [{ models }, catalog, { latestVehicleProfileSpecs }] = await Promise.all([
    JSON.parse(
      await readFile(
        new URL("data/catalog/chevrolet-us-nameplates.json", root),
        "utf8",
      ),
    ),
    JSON.parse(
      await readFile(
        new URL("data/catalog/chevrolet-latest-profile-catalog.json", root),
        "utf8",
      ),
    ),
    loadProfileModule(),
  ]);

  assert.equal(catalog.record_count, models.length);
  assert.equal(catalog.records.length, models.length);
  assert.equal(
    new Set(catalog.records.map(({ model_id }) => model_id)).size,
    models.length,
  );
  assert.equal(
    new Set(catalog.records.map(({ profile_id }) => profile_id)).size,
    models.length,
  );

  for (const model of models) {
    const record = catalog.records.find(
      ({ model_id }) => model_id === model.id,
    );
    assert.ok(record, `missing latest profile selection for ${model.id}`);
    assert.equal(
      record.representative_year,
      Math.max(...model.model_year_ranges.map(({ end }) => end)),
    );
    assert.ok(record.representative_variant.length >= 12);
    assert.ok(record.body_style.length >= 3);
    assert.ok(record.source_urls.length >= 1);
    if (model.current) {
      assert.equal(
        record.profile_id,
        latestVehicleProfileSpecs[model.id].profileId,
        `${model.id} normalized profile selection must use the rendered profile ID`,
      );
    }
  }

  assert.equal(
    catalog.status_counts["current-model-reviewed"],
    models.filter((model) => model.current).length,
  );
  assert.ok(
    catalog.status_counts["representative-variant-research-needed"] > 0,
    "unresolved multi-body nameplates must remain explicitly unresolved",
  );
});

test("current profile geometry remains model-specific, including related vehicles", async () => {
  const { latestVehicleProfileSpecs: specs } = await loadProfileModule();
  const profileIds = Object.values(specs).map(({ profileId }) => profileId);
  const bodyPaths = Object.values(specs).map(({ bodyPath }) => bodyPath);

  assert.equal(new Set(profileIds).size, profileIds.length);
  assert.equal(
    new Set(bodyPaths).size,
    bodyPaths.length,
    "no two current models may share the same outer silhouette",
  );

  for (const [left, right] of [
    ["tahoe", "suburban"],
    ["brightdrop-400", "brightdrop-600"],
    ["silverado", "silverado-hd"],
    ["silverado", "silverado-ev"],
    ["blazer", "blazer-ev"],
    ["equinox", "equinox-ev"],
  ]) {
    assert.notEqual(specs[left].bodyPath, specs[right].bodyPath);
    assert.notEqual(specs[left].profileId, specs[right].profileId);
  }
});

test("related current vehicles preserve official dimensional and landmark differences", async () => {
  const { latestVehicleProfileSpecs: specs } = await loadProfileModule();

  const brightDropLengthRatio =
    (specs["brightdrop-400"].bodyFrontX -
      specs["brightdrop-400"].bodyRearX) /
    (specs["brightdrop-600"].bodyFrontX -
      specs["brightdrop-600"].bodyRearX);
  assert.ok(
    Math.abs(brightDropLengthRatio - 238.6 / 290) <= 0.015,
    "BrightDrop 400 and 600 drawn lengths must follow the official 238.6:290 ratio",
  );

  assert.equal(specs["low-cab-forward"].rearDualWheel, true);
  assert.equal(specs["low-cab-forward"].mirrorStyle, "tow");
  assert.equal(specs["silverado-hd"].mirrorStyle, "tow");
  assert.ok(
    specs["silverado-hd"].bodyFrontX - specs["silverado-hd"].bodyRearX >
      specs.silverado.bodyFrontX - specs.silverado.bodyRearX,
  );
  assert.ok(
    specs["silverado-hd"].darkFillPaths.length >= 3,
    "Silverado HD needs filled grille, lower fascia, and hood-vent landmarks",
  );
  assert.ok(
    specs.corvette.rearWheelRadius > specs.corvette.frontWheelRadius,
    "C8 profile needs its larger rear wheel",
  );
  assert.equal(specs.tahoe.handlePoints.length, 2);
  assert.equal(specs.suburban.handlePoints.length, 2);
  assert.ok(
    specs.suburban.bodyFrontX - specs.suburban.bodyRearX >
      (specs.tahoe.bodyFrontX - specs.tahoe.bodyRearX) * 1.06,
    "Suburban must retain a visibly longer rear cargo body than Tahoe",
  );
  assert.ok(specs.express.darkFillPaths.length >= 2);
  assert.ok(specs["silverado-ev"].lightFillPaths.length >= 1);
  assert.ok(specs["blazer-ev"].lightFillPaths.length >= 1);
  assert.ok(specs["equinox-ev"].lightFillPaths.length >= 1);
});

test("detailed profiles resolve only inside their actual latest-generation bands", async () => {
  const { detailedProfileFor } = await loadProfileModule();

  assert.equal(detailedProfileFor("corvette", 2026)?.profileId, "corvette-c8-2026");
  assert.equal(detailedProfileFor("corvette", 2019), undefined);
  assert.equal(detailedProfileFor("tahoe", 2026)?.profileId, "tahoe-gmtt1uc-refresh-2026");
  assert.equal(detailedProfileFor("tahoe", 2003), undefined);
  assert.equal(detailedProfileFor("unknown-model", 2026), undefined);
});

test("renderer exposes detailed profile identity and layered vehicle paint", async () => {
  const source = await readFile(
    new URL("app/vehicle-profile-svg.tsx", root),
    "utf8",
  );

  assert.match(source, /data-profile-fidelity="model-specific"/);
  assert.match(source, /data-profile-id=\{spec\.profileId\}/);
  assert.match(source, /data-profile-year=\{spec\.representativeYear\}/);
  assert.match(source, /data-profile-variant=\{spec\.representativeVariant\}/);
  assert.match(source, /linearGradient/);
  assert.match(source, /detailedWheel/);
  assert.match(source, /detailedProfileFor\(modelId, modelYear\)/);
});

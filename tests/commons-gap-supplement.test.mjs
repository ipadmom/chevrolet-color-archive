import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";
import test from "node:test";

const execFileAsync = promisify(execFile);
const root = path.resolve(fileURLToPath(new URL("../", import.meta.url)));

async function loadJson(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
}

test("Commons gap supplement covers all targets and retains only reviewed exact identities", async () => {
  const [plan, manifest] = await Promise.all([
    loadJson("data/photos/commons-gap-supplement.json"),
    loadJson("data/photos/commons-release-manifest.json"),
  ]);
  const candidates = plan.targets.flatMap((target) =>
    (target.candidates ?? []).map((candidate) => ({
      ...candidate,
      model_id: target.model_id,
    })),
  );
  const selected = candidates.filter((candidate) => candidate.decision === "selected");
  const selectedModels = [...new Set(selected.map((candidate) => candidate.model_id))];
  const expectedGaps = [
    "series-f",
    "copper-cooled",
    "malibu-limited",
    "malibu-classic-2008",
    "chevy-90",
    "bison",
    "bruin",
    "traverse-limited",
    "brightdrop-400",
  ];

  assert.equal(plan.targets.length, 26);
  assert.equal(new Set(plan.targets.map((target) => target.model_id)).size, 26);
  assert.equal(candidates.filter((candidate) => candidate.decision === "review").length, 0);
  assert.equal(selected.length, 26);
  assert.equal(selectedModels.length, 17);
  assert.deepEqual(plan.results.selected_model_ids, selectedModels);
  assert.deepEqual(plan.results.models_still_without_exact_photo, expectedGaps);
  assert.equal(plan.results.release_upload_performed, true);
  assert.equal(plan.results.full_raw_source_record_paths.length, 1);
  assert.match(
    plan.results.full_raw_source_record_paths[0],
    /^tmp\/commons-gap-audit\/selected-raw\/commons-titles-response-/,
  );

  assert.equal(manifest.coverage_supplement.visual_review_completed, true);
  assert.equal(manifest.coverage_supplement.release_upload_performed, true);
  assert.equal(manifest.coverage_supplement.selected_asset_count, 26);
  assert.equal(manifest.coverage_supplement.unique_assets_added, 25);
  assert.deepEqual(manifest.coverage_supplement.selected_model_ids, selectedModels);
  assert.deepEqual(manifest.coverage_supplement.models_still_without_exact_photo, expectedGaps);

  const assets = new Map(manifest.assets.map((asset) => [asset.candidate_id, asset]));
  for (const result of plan.results.candidates) {
    const asset = assets.get(result.candidate_id);
    assert.ok(asset, `missing manifest asset for ${result.page_title}`);
    assert.ok(asset.model_ids.includes(result.model_id));
    assert.ok(
      asset.selection_contexts.some(
        (context) =>
          context.kind === "reviewed_gap_supplement" &&
          context.model_id === result.model_id &&
          context.exact_page_title === result.page_title,
      ),
    );
    assert.match(asset.source_page_url, /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
    assert.match(asset.source_original_url, /^https:\/\/upload\.wikimedia\.org\//);
    assert.match(asset.commons_sha1, /^[a-f0-9]{40}$/);
    assert.match(asset.sha256, /^[a-f0-9]{64}$/);
    assert.ok(asset.author.trim());
    assert.ok(asset.author_raw_html);
    assert.ok(asset.attribution.trim());
    assert.ok(asset.license.trim());
    assert.match(asset.license_url, /^https?:\/\//);
    assert.deepEqual(
      asset.commons_raw_record_paths,
      plan.results.full_raw_source_record_paths,
    );
    assert.equal(asset.supplement_audit, "data/photos/commons-gap-supplement.json");
    assert.match(asset.preview_sha256, /^[a-f0-9]{64}$/);
    assert.equal(asset.site_asset_url, asset.preview_release_asset_url);
  }

  const modelById = new Map(manifest.models.map((model) => [model.model_id, model]));
  for (const modelId of selectedModels) {
    assert.ok(modelById.get(modelId).asset_ids.length > 0, modelId);
    assert.ok(modelById.get(modelId).representative_asset_ids.length > 0, modelId);
  }
  for (const modelId of expectedGaps) {
    assert.deepEqual(modelById.get(modelId).asset_ids, [], modelId);
  }

  const forbiddenAssociations = [
    ["pre-ck-truck", "Chevrolet Advance Design in Paris.jpg"],
    ["copper-cooled", "Chevrolet cooper cooled 1923.jpg"],
    ["corvan", "1963 Corvair 95 (10767367525).jpg"],
    ["tiltmaster-w-series", "High Line td 46 - W 30th St & 11th Av.jpg"],
    ["tiltmaster-w-series", "Tap Tap in Haiti hauling freight.jpg"],
  ];
  for (const [modelId, filename] of forbiddenAssociations) {
    assert.ok(
      !manifest.assets.some(
        (asset) => asset.original_filename === filename && asset.model_ids.includes(modelId),
      ),
      `${filename} must not represent ${modelId}`,
    );
  }
});

test("Commons crawler helpers can be imported without starting a crawl", async () => {
  const crawler = path.join(root, "scripts", "crawl-wikimedia-release-photos.mjs");
  const result = await execFileAsync(
    process.execPath,
    ["-e", `import(${JSON.stringify(pathToFileURL(crawler).href)})`],
    { cwd: root },
  );
  assert.equal(result.stdout, "");
  assert.equal(result.stderr, "");
});

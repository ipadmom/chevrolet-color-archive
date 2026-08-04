import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = path.resolve(fileURLToPath(new URL("../", import.meta.url)));

async function loadJson(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
}

test("current-model Commons audit accounts for every current catalog nameplate", async () => {
  const [catalog, manifest, audit] = await Promise.all([
    loadJson("data/catalog/chevrolet-us-nameplates.json"),
    loadJson("data/photos/commons-release-manifest.json"),
    loadJson("data/photos/current-model-commons-photo-audit.json"),
  ]);
  const currentIds = catalog.models.filter((model) => model.current).map((model) => model.id);
  const manifestByModel = new Map(manifest.models.map((model) => [model.model_id, model]));

  assert.deepEqual(audit.manifest_coverage.current_model_ids, currentIds);
  assert.equal(currentIds.length, 18);
  const expectedCounts = Object.fromEntries(
    currentIds.map((modelId) => [modelId, manifestByModel.get(modelId).asset_ids.length]),
  );
  assert.deepEqual(audit.manifest_coverage.archived_asset_counts, expectedCounts);
  assert.equal(audit.manifest_coverage.archived_asset_total, Object.values(expectedCounts).reduce((total, count) => total + count, 0));
  assert.equal(audit.manifest_coverage.archived_asset_total, 46);
  assert.equal(audit.manifest_coverage.published_current_model_photo_to_color_links, 1);
  assert.match(
    audit.manifest_coverage.published_current_model_photo_to_color_boundary,
    /qualified visual example only.*Factory-paint identity remains unverified/,
  );
});

test("undercovered current models retain only complete, pinned archive rows", async () => {
  const [manifest, audit] = await Promise.all([
    loadJson("data/photos/commons-release-manifest.json"),
    loadJson("data/photos/current-model-commons-photo-audit.json"),
  ]);
  const assets = new Map(manifest.assets.map((asset) => [asset.candidate_id, asset]));
  assert.deepEqual(
    Object.fromEntries(audit.undercovered_models.map((model) => [model.model_id, model.archived_candidate_count])),
    { "low-cab-forward": 1, "brightdrop-400": 1 },
  );
  for (const model of audit.undercovered_models) {
    for (const id of model.existing_archived_candidate_ids ?? []) {
      const asset = assets.get(id);
      assert.ok(asset, `${model.model_id}: missing ${id}`);
      assert.match(asset.source_page_url, /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
      assert.match(asset.source_original_url, /^https:\/\/upload\.wikimedia\.org\//);
      assert.match(asset.commons_sha1, /^[a-f0-9]{40}$/);
      assert.match(asset.sha256, /^[a-f0-9]{64}$/);
      assert.ok(asset.author.trim());
      assert.ok(asset.license.trim());
      assert.ok(asset.width >= 640 && asset.height >= 400);
      assert.match(asset.release_asset_url, /^https:\/\/github\.com\/ipadmom\/chevrolet-color-archive\/releases\/download\/photo-archive-v1\//);
    }
  }
});

test("new BrightDrop 400 cross-reference is archived with exact original and preview digests", async () => {
  const [manifest, audit] = await Promise.all([
    loadJson("data/photos/commons-release-manifest.json"),
    loadJson("data/photos/current-model-commons-photo-audit.json"),
  ]);
  assert.equal(audit.rows_added_to_production_manifest, 2);
  assert.equal(audit.release_stage_candidates.length, 0);
  assert.equal(audit.archived_this_pass.length, 2);
  const candidate = audit.archived_this_pass.find(
    (row) => row.model_id === "brightdrop-400",
  );
  assert.ok(candidate);
  assert.equal(candidate.status, "archived_identity_reference");
  assert.equal(candidate.identity_basis, "official_event_roster_plus_exact_file_caption");
  assert.equal(candidate.identity_source_urls.length, 3);
  assert.match(candidate.identity_evidence, /Commons does not itself supply the 400 designation/i);
  assert.equal(candidate.paint_evidence, "None. The file is not paint evidence.");
  assert.equal(candidate.mime, "image/jpeg");
  assert.ok(candidate.width >= 640 && candidate.height >= 400);
  assert.match(candidate.commons_sha1, /^[a-f0-9]{40}$/);
  assert.match(candidate.sha256, /^[a-f0-9]{64}$/);
  assert.match(candidate.preview_sha256, /^[a-f0-9]{64}$/);
  assert.match(candidate.release_asset_url, /^https:\/\/github\.com\/ipadmom\/chevrolet-color-archive\/releases\/download\/photo-archive-v1\//);
  assert.match(candidate.site_asset_url, /^https:\/\/github\.com\/ipadmom\/chevrolet-color-archive\/releases\/download\/photo-archive-v1\//);
  const manifestAsset = manifest.assets.find(
    (asset) => asset.candidate_id === candidate.candidate_id,
  );
  assert.ok(manifestAsset);
  assert.equal(manifestAsset.sha256, candidate.sha256);
  assert.equal(manifestAsset.preview_sha256, candidate.preview_sha256);
  assert.equal(manifestAsset.release_asset_url, candidate.release_asset_url);
  assert.equal(manifestAsset.site_asset_url, candidate.site_asset_url);
  const brightDrop = manifest.models.find(
    (model) => model.model_id === "brightdrop-400",
  );
  assert.ok(brightDrop.asset_ids.includes(candidate.candidate_id));
  assert.equal(brightDrop.representative_asset_ids.length, 1);
  const context = manifestAsset.selection_contexts.find(
    (row) => row.model_id === "brightdrop-400",
  );
  assert.equal(context.identity_basis, candidate.identity_basis);
  assert.deepEqual(context.identity_source_urls, candidate.identity_source_urls);
});

test("BrightDrop 600 finding remains archived with exact identity metadata", async () => {
  const [manifest, audit] = await Promise.all([
    loadJson("data/photos/commons-release-manifest.json"),
    loadJson("data/photos/current-model-commons-photo-audit.json"),
  ]);
  const candidate = audit.archived_this_pass.find(
    (row) => row.model_id === "brightdrop-600",
  );
  assert.ok(candidate);
  assert.match(candidate.description, /Chevrolet BrightDrop 600/i);
  const manifestAsset = manifest.assets.find(
    (asset) => asset.candidate_id === candidate.candidate_id,
  );
  assert.ok(manifestAsset);
  assert.equal(manifestAsset.sha256, candidate.sha256);
  assert.equal(manifestAsset.preview_sha256, candidate.preview_sha256);
});

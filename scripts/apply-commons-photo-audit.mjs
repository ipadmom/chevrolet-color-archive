import { copyFile, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = path.join(
  root,
  "data",
  "photos",
  "commons-release-manifest.json",
);
const auditInputPath = path.join(root, "tmp", "commons-candidate-audit.json");
const auditArchivePath = path.join(
  root,
  "data",
  "photos",
  "commons-candidate-audit.json",
);

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const audit = JSON.parse(await readFile(auditInputPath, "utf8"));
const originalAssetCount = manifest.assets.length;
const reassignmentTargets = new Map([
  ["reassign_to_vega-panel-express", "vega-panel-express"],
]);

for (const decision of audit.reject_list) {
  const asset = manifest.assets.find(
    (candidate) => candidate.candidate_id === decision.candidate_id,
  );
  if (!asset) {
    throw new Error(`Audit candidate is absent: ${decision.candidate_id}`);
  }
  if (!asset.model_ids.includes(decision.model_id)) {
    throw new Error(
      `Audit association is absent: ${decision.candidate_id}/${decision.model_id}`,
    );
  }

  const targetModel = reassignmentTargets.get(decision.recommended_action);
  asset.selection_contexts = asset.selection_contexts.flatMap((context) => {
    if (context.model_id !== decision.model_id) return [context];
    if (targetModel) return [{ ...context, model_id: targetModel }];
    return [];
  });
  asset.model_ids = [
    ...new Set(asset.selection_contexts.map((context) => context.model_id)),
  ];
  asset.selection_kinds = [
    ...new Set(asset.selection_contexts.map((context) => context.kind)),
  ];
}

manifest.assets = manifest.assets.filter(
  (asset) => asset.selection_contexts.length > 0 && asset.model_ids.length > 0,
);

const assetById = new Map(
  manifest.assets.map((asset) => [asset.candidate_id, asset]),
);
for (const model of manifest.models) {
  const modelAssets = manifest.assets.filter((asset) =>
    asset.model_ids.includes(model.model_id),
  );
  model.asset_ids = modelAssets.map((asset) => asset.candidate_id);
  model.representative_asset_ids = modelAssets
    .filter((asset) =>
      asset.selection_contexts.some(
        (context) =>
          context.model_id === model.model_id && context.kind === "representative",
      ),
    )
    .map((asset) => asset.candidate_id);

  const exactYears = new Map();
  for (const asset of modelAssets) {
    for (const context of asset.selection_contexts) {
      if (
        context.model_id !== model.model_id ||
        context.kind !== "exact_year" ||
        !Number.isInteger(context.exact_year)
      ) {
        continue;
      }
      const ids = exactYears.get(context.exact_year) ?? [];
      ids.push(asset.candidate_id);
      exactYears.set(context.exact_year, ids);
    }
  }
  model.exact_year_candidates = [...exactYears]
    .sort(([left], [right]) => left - right)
    .map(([year, assetIds]) => ({ year, asset_ids: [...new Set(assetIds)] }));
}

for (const model of manifest.models) {
  for (const assetId of model.asset_ids) {
    if (!assetById.has(assetId)) {
      throw new Error(`${model.model_id} references missing asset ${assetId}`);
    }
  }
}

const finalBytes = manifest.assets.reduce((sum, asset) => sum + asset.bytes, 0);
manifest.generated_at = new Date().toISOString();
manifest.policy.review_required_before_site_publication = false;
manifest.policy.review_required_before_color_classification = true;
manifest.policy.photo_evidence_rule =
  "Archived photographs are illustrative identification references and never prove factory color availability or original finish.";
manifest.run.unique_assets_selected = manifest.assets.length;
manifest.run.staged_asset_count = manifest.assets.length;
manifest.run.staged_total_bytes = finalBytes;
manifest.run.assets_excluded_by_quality_audit =
  originalAssetCount - manifest.assets.length;
manifest.run.model_associations_corrected = audit.counts.flagged_model_associations;
manifest.quality_audit = {
  report: "data/photos/commons-candidate-audit.json",
  generated_at: audit.generated_at,
  original_asset_count: originalAssetCount,
  published_candidate_count: manifest.assets.length,
  excluded_asset_count: originalAssetCount - manifest.assets.length,
  reassigned_association_count: audit.counts.recommended_reassignments,
  removed_shared_association_count:
    audit.counts.recommended_shared_asset_association_removals,
  scope: audit.scope,
};

const temporaryManifestPath = `${manifestPath}.tmp`;
await writeFile(temporaryManifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
await rename(temporaryManifestPath, manifestPath);
await copyFile(auditInputPath, auditArchivePath);

console.log(
  JSON.stringify({
    original_assets: originalAssetCount,
    final_assets: manifest.assets.length,
    final_bytes: finalBytes,
    models_with_assets: manifest.models.filter((model) => model.asset_ids.length)
      .length,
    archived_audit: path.relative(root, auditArchivePath).replaceAll("\\", "/"),
  }),
);

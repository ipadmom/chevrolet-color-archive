#!/usr/bin/env node

import { createHash } from "node:crypto";
import {
  mkdir,
  readFile,
  readdir,
  rename,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildTitlesUrl,
  fetchWithRetry,
  htmlToText,
  makeCandidate,
  metadataValue,
  normalizedText,
  stageCandidate,
  writeJsonAtomic,
} from "./crawl-wikimedia-release-photos.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_OWNER = "ipadmom";
const DEFAULT_REPOSITORY = "chevrolet-color-archive";
const DEFAULT_RELEASE_TAG = "photo-archive-v1";

function parseArgs(argv) {
  const options = {
    root: ROOT,
    catalog: "data/catalog/chevrolet-us-nameplates.json",
    manifest: "data/photos/commons-release-manifest.json",
    plan: "data/photos/commons-gap-supplement.json",
    assetDir: "tmp/commons-release-assets",
    rawDir: "tmp/commons-gap-audit/selected-raw",
    owner: DEFAULT_OWNER,
    repository: DEFAULT_REPOSITORY,
    releaseTag: DEFAULT_RELEASE_TAG,
    maxBytes: 80 * 1024 * 1024,
    refresh: false,
    apply: false,
  };

  const pathOptions = new Set([
    "--catalog",
    "--manifest",
    "--plan",
    "--asset-dir",
    "--raw-dir",
  ]);
  const stringOptions = new Map([
    ["--owner", "owner"],
    ["--repository", "repository"],
    ["--release-tag", "releaseTag"],
  ]);

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--apply") {
      options.apply = true;
      continue;
    }
    if (argument === "--refresh") {
      options.refresh = true;
      continue;
    }
    if (argument === "--help" || argument === "-h") {
      console.log(`Usage: node scripts/apply-commons-gap-supplement.mjs [options]

Stages exact-title Wikimedia Commons candidates from the reviewed gap plan.
The default mode writes complete raw API responses and stages originals without
touching the release manifest. --apply requires every review decision to be
resolved, merges selected candidates, and updates the versioned audit report.
This script never creates or uploads a GitHub Release.

  --apply               Merge selected records into the photo manifest
  --refresh             Redownload staged originals
  --catalog PATH        Catalog JSON
  --manifest PATH       Existing Commons release manifest
  --plan PATH           Reviewed gap supplement JSON
  --asset-dir PATH      Ignored original staging directory
  --raw-dir PATH        Ignored full API-response directory
  --owner OWNER         Pinned release URL owner
  --repository REPO     Pinned release URL repository
  --release-tag TAG     Pinned release URL tag
`);
      process.exit(0);
    }
    const mapped = stringOptions.get(argument);
    if (mapped || pathOptions.has(argument)) {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`Missing value for ${argument}`);
      }
      index += 1;
      if (mapped) options[mapped] = value;
      else {
        const key = argument
          .slice(2)
          .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
        options[key] = value;
      }
      continue;
    }
    throw new Error(`Unknown argument: ${argument}`);
  }

  for (const key of ["catalog", "manifest", "plan", "assetDir", "rawDir"]) {
    options[key] = path.resolve(options.root, options[key]);
    const relative = path.relative(options.root, options[key]);
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      throw new Error(`${key} must stay inside the repository root`);
    }
  }
  return options;
}

function relativePath(root, file) {
  return path.relative(root, file).replaceAll(path.sep, "/");
}

function flattenCandidates(plan) {
  return (plan.targets ?? []).flatMap((target) =>
    (target.candidates ?? []).map((candidate) => ({
      ...candidate,
      model_id: target.model_id,
      target_outcome: target.outcome,
    })),
  );
}

function validatePlan(plan, catalog, options) {
  const models = new Map((catalog.models ?? []).map((model) => [model.id, model]));
  const targetIds = new Set();
  const titles = new Set();
  for (const target of plan.targets ?? []) {
    if (!models.has(target.model_id)) {
      throw new Error(`Unknown catalog model in supplement: ${target.model_id}`);
    }
    if (targetIds.has(target.model_id)) {
      throw new Error(`Duplicate target model: ${target.model_id}`);
    }
    targetIds.add(target.model_id);
    const selected = (target.candidates ?? []).filter(
      (candidate) => candidate.decision === "selected",
    );
    if (selected.length > (plan.policy?.maximum_representatives_per_model ?? 2)) {
      throw new Error(`Too many selected representatives for ${target.model_id}`);
    }
    for (const candidate of target.candidates ?? []) {
      if (!new Set(["selected", "review", "rejected"]).has(candidate.decision)) {
        throw new Error(
          `Invalid decision for ${target.model_id} ${candidate.page_title}`,
        );
      }
      if (!String(candidate.page_title ?? "").startsWith("File:")) {
        throw new Error(`Candidate is not an exact Commons File title: ${candidate.page_title}`);
      }
      if (titles.has(candidate.page_title)) {
        throw new Error(`Duplicate candidate page title: ${candidate.page_title}`);
      }
      titles.add(candidate.page_title);
      if (!(candidate.identity_terms ?? []).length) {
        throw new Error(`Missing exact identity terms for ${candidate.page_title}`);
      }
    }
  }
  if (targetIds.size !== 26) {
    throw new Error(`Gap supplement must account for all 26 targets, found ${targetIds.size}`);
  }
  if (options.apply) {
    const unresolved = flattenCandidates(plan).filter(
      (candidate) => candidate.decision === "review",
    );
    if (unresolved.length) {
      throw new Error(
        `Resolve ${unresolved.length} visual review decisions before --apply`,
      );
    }
  }
  return models;
}

async function writeRawAtomic(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.tmp-${process.pid}`;
  await writeFile(temporary, value, "utf8");
  await rename(temporary, file);
}

async function fetchExactPages(candidates, options) {
  const rawFiles = [];
  const pages = [];
  for (let index = 0; index < candidates.length; index += 40) {
    const batch = candidates.slice(index, index + 40);
    const url = buildTitlesUrl(batch.map((candidate) => candidate.page_title));
    const response = await fetchWithRetry(url.href);
    const rawText = await response.text();
    const rawPath = path.join(
      options.rawDir,
      `commons-titles-response-${String(index / 40 + 1).padStart(3, "0")}.json`,
    );
    await writeRawAtomic(rawPath, rawText);
    rawFiles.push(relativePath(options.root, rawPath));
    const raw = JSON.parse(rawText);
    if (raw.error) {
      throw new Error(`Commons API error: ${JSON.stringify(raw.error)}`);
    }
    pages.push(...(raw.query?.pages ?? []));
  }
  return { pages, rawFiles };
}

function exactYearAllowed(model, year) {
  if (year === null || year === undefined) return true;
  return (model.model_year_ranges ?? []).some(
    (range) => year >= range.start && year <= range.end,
  );
}

function pageEvidence(page) {
  const imageInfo = page.imageinfo?.[0] ?? {};
  const extmetadata = imageInfo.extmetadata ?? {};
  return [
    page.title,
    metadataValue(extmetadata, "ObjectName"),
    metadataValue(extmetadata, "ImageDescription"),
    metadataValue(extmetadata, "Categories"),
  ]
    .map(htmlToText)
    .filter(Boolean)
    .join(" | ");
}

function pageMapKey(title) {
  return normalizedText(String(title ?? "").replace(/^File:/i, ""));
}

function normalizeCandidate(record, page, model, options, rawFiles) {
  const syntheticModel = {
    ...model,
    aliases: [...new Set([...(model.aliases ?? []), ...(record.identity_terms ?? [])])],
  };
  const result = makeCandidate(
    page,
    syntheticModel,
    `exact Commons page title: ${record.page_title}`,
    "reviewed_gap_supplement",
    null,
    options,
  );
  if (!result.candidate) {
    throw new Error(`${record.page_title}: ${result.rejected}`);
  }
  const evidence = pageEvidence(page);
  const evidenceNormalized = normalizedText(evidence);
  const identityMatch = (record.identity_terms ?? []).find((term) =>
    evidenceNormalized.includes(normalizedText(term)),
  );
  if (!identityMatch) {
    throw new Error(`${record.page_title}: exact identity term is absent from metadata`);
  }
  if (!exactYearAllowed(model, record.explicit_year)) {
    throw new Error(
      `${record.page_title}: year ${record.explicit_year} is outside the catalog range`,
    );
  }
  if (
    record.explicit_year !== null &&
    record.explicit_year !== undefined &&
    !new RegExp(`\\b${record.explicit_year}\\b`).test(htmlToText(evidence))
  ) {
    throw new Error(`${record.page_title}: explicit year is absent from Commons metadata`);
  }
  return {
    ...result.candidate,
    explicitYear: record.explicit_year ?? result.candidate.explicitYear ?? null,
    explicitYearSource:
      record.explicit_year === null || record.explicit_year === undefined
        ? result.candidate.explicitYearSource
        : "reviewed Commons metadata",
    explicitYearEvidence:
      record.explicit_year === null || record.explicit_year === undefined
        ? result.candidate.explicitYearEvidence
        : record.evidence_note,
    score: Math.max(200, result.candidate.score),
    supplement: record,
    supplementEvidence: evidence,
    supplementIdentityMatch: identityMatch,
    supplementRawFiles: rawFiles,
  };
}

async function verifyCommonsSha1(staged) {
  const bytes = await readFile(path.resolve(ROOT, staged.localPath));
  const sha1 = createHash("sha1").update(bytes).digest("hex");
  if (sha1 !== staged.commonsSha1) {
    throw new Error(
      `Commons SHA-1 mismatch for ${staged.id}: API ${staged.commonsSha1}, local ${sha1}`,
    );
  }
}

function selectionContext(staged) {
  return {
    kind: "reviewed_gap_supplement",
    model_id: staged.supplement.model_id,
    exact_year: staged.explicitYear,
    evidence_note: staged.supplement.evidence_note,
    exact_page_title: staged.supplement.page_title,
  };
}

function toManifestAsset(staged, options) {
  const context = selectionContext(staged);
  return {
    candidate_id: staged.id,
    status: staged.status,
    selection_kinds: [context.kind],
    selection_contexts: [context],
    model_ids: [context.model_id],
    explicit_year: staged.explicitYear,
    explicit_year_source: staged.explicitYearSource,
    explicit_year_evidence: staged.explicitYearEvidence,
    source_page_url: staged.sourcePageUrl,
    source_original_url: staged.sourceOriginalUrl,
    source_timestamp: staged.sourceTimestamp,
    author: staged.author,
    author_raw_html: staged.authorRawHtml,
    credit: staged.credit,
    credit_raw_html: staged.creditRawHtml,
    license: staged.license,
    license_family: staged.licenseFamily,
    license_url: staged.licenseUrl,
    license_url_source: staged.licenseUrlSource,
    usage_terms: staged.usageTerms,
    attribution_required: staged.attributionRequired,
    attribution: staged.attribution,
    description: staged.description,
    model_queries: staged.modelQueries,
    score: staged.score,
    sha256: staged.sha256,
    commons_sha1: staged.commonsSha1,
    mime: staged.mime,
    width: staged.width,
    height: staged.height,
    bytes: staged.stagedBytes,
    original_filename: staged.originalFilename,
    release_tag: staged.releaseTag,
    release_asset_name: staged.releaseAssetName,
    release_asset_url: staged.releaseAssetUrl,
    site_asset_url: staged.siteAssetUrl,
    local_path: staged.localPath,
    commons_raw_record_paths: staged.supplementRawFiles,
    supplement_audit: relativePath(options.root, options.plan),
  };
}

function addUnique(values, value) {
  if (!values.includes(value)) values.push(value);
}

function mergeAsset(existing, staged, options) {
  const context = selectionContext(staged);
  if (!existing) return toManifestAsset(staged, options);
  existing.selection_kinds ??= [];
  addUnique(existing.selection_kinds, context.kind);
  existing.selection_contexts ??= [];
  const priorContext = existing.selection_contexts.find(
    (item) => item.kind === context.kind && item.model_id === context.model_id,
  );
  if (priorContext) {
    Object.assign(priorContext, context);
  } else {
    existing.selection_contexts.push(context);
  }
  const hasIndependentYearContext = existing.selection_contexts.some(
    (item) =>
      item.kind !== context.kind &&
      item.exact_year !== null &&
      item.exact_year !== undefined,
  );
  if (!hasIndependentYearContext) {
    existing.explicit_year = staged.explicitYear;
    existing.explicit_year_source = staged.explicitYearSource;
    existing.explicit_year_evidence = staged.explicitYearEvidence;
  }
  existing.model_ids ??= [];
  addUnique(existing.model_ids, context.model_id);
  existing.model_queries ??= [];
  for (const query of staged.modelQueries) addUnique(existing.model_queries, query);
  existing.commons_raw_record_paths = [
    ...new Set([
      ...(existing.commons_raw_record_paths ?? []),
      ...staged.supplementRawFiles,
    ]),
  ];
  existing.supplement_audit = relativePath(options.root, options.plan);
  return existing;
}

async function stagedDirectoryStats(assetDir) {
  const files = [];
  for (const entry of await readdir(assetDir, { withFileTypes: true })) {
    if (!entry.isFile() || entry.name.includes(".tmp-")) continue;
    const fileStat = await stat(path.join(assetDir, entry.name));
    files.push({ name: entry.name, bytes: fileStat.size });
  }
  return {
    count: files.length,
    bytes: files.reduce((sum, file) => sum + file.bytes, 0),
  };
}

function mergeIntoManifest(manifest, selected, plan, options) {
  const assetsBySha1 = new Map(
    (manifest.assets ?? []).map((asset) => [asset.commons_sha1, asset]),
  );
  let assetsAdded = 0;
  const candidateByModel = new Map();

  for (const staged of selected) {
    const existing = assetsBySha1.get(staged.commonsSha1);
    const merged = mergeAsset(existing, staged, options);
    if (!existing) {
      manifest.assets.push(merged);
      assetsBySha1.set(staged.commonsSha1, merged);
      assetsAdded += 1;
    }
    const modelId = staged.supplement.model_id;
    const list = candidateByModel.get(modelId) ?? [];
    list.push({ staged, asset: merged });
    candidateByModel.set(modelId, list);
  }

  const modelById = new Map(
    (manifest.models ?? []).map((model) => [model.model_id, model]),
  );
  for (const [modelId, candidates] of candidateByModel) {
    const model = modelById.get(modelId);
    if (!model) throw new Error(`Manifest is missing model ${modelId}`);
    model.asset_ids ??= [];
    model.representative_asset_ids ??= [];
    model.exact_year_candidates ??= [];
    model.search_queries ??= [];
    const supplementAssetIds = new Set(
      candidates.map(({ asset }) => asset.candidate_id),
    );
    model.search_queries = model.search_queries.filter(
      (item) => item.kind !== "reviewed_exact_title",
    );
    model.exact_year_candidates = model.exact_year_candidates
      .map((item) => ({
        ...item,
        asset_ids: (item.asset_ids ?? []).filter(
          (candidateId) => !supplementAssetIds.has(candidateId),
        ),
      }))
      .filter(
        (item) =>
          item.asset_ids.length > 0 ||
          item.query !== "reviewed exact Commons page title supplement",
      );
    for (const { staged, asset } of candidates) {
      addUnique(model.asset_ids, asset.candidate_id);
      if (model.representative_asset_ids.length < 2) {
        addUnique(model.representative_asset_ids, asset.candidate_id);
      }
      const searchRecord = {
        kind: "reviewed_exact_title",
        target_year: staged.explicitYear,
        query: `exact Commons page title: ${staged.supplement.page_title}`,
        returned: 1,
        eligible: 1,
        rejections: {},
      };
      model.search_queries.push(searchRecord);
      if (staged.explicitYear !== null && staged.explicitYear !== undefined) {
        let yearRecord = model.exact_year_candidates.find(
          (item) => item.year === staged.explicitYear,
        );
        if (!yearRecord) {
          yearRecord = {
            year: staged.explicitYear,
            asset_ids: [],
            query: `reviewed exact Commons page title supplement`,
          };
          model.exact_year_candidates.push(yearRecord);
        }
        addUnique(yearRecord.asset_ids, asset.candidate_id);
      }
    }
  }

  const selectedModels = [...candidateByModel.keys()];
  const noPhotoModels = (plan.targets ?? [])
    .filter((target) => !(target.candidates ?? []).some((item) => item.decision === "selected"))
    .map((target) => target.model_id);
  const appliedAt = new Date().toISOString();
  manifest.generated_at = appliedAt;
  manifest.run.unique_assets_selected = manifest.assets.length;
  manifest.run.staged_asset_count = manifest.assets.length;
  manifest.run.staged_total_bytes = manifest.assets.reduce(
    (sum, asset) => sum + Number(asset.bytes ?? 0),
    0,
  );
  const priorSupplement = manifest.coverage_supplement;
  const retainedAssetsAdded =
    priorSupplement?.report === relativePath(options.root, options.plan)
      ? (priorSupplement.unique_assets_added ?? assetsAdded)
      : assetsAdded;
  const retainedReleaseUploadPerformed =
    priorSupplement?.report === relativePath(options.root, options.plan)
      ? Boolean(priorSupplement.release_upload_performed)
      : false;
  manifest.coverage_supplement = {
    report: relativePath(options.root, options.plan),
    applied_at: appliedAt,
    target_model_count: plan.targets.length,
    selected_model_count: selectedModels.length,
    selected_asset_count: selected.length,
    unique_assets_added: retainedAssetsAdded,
    selected_model_ids: selectedModels,
    models_still_without_exact_photo: noPhotoModels,
    raw_source_record_paths: [...new Set(selected.flatMap((item) => item.supplementRawFiles))],
    visual_review_completed: true,
    release_upload_performed: retainedReleaseUploadPerformed,
  };
  return {
    assetsAdded: retainedAssetsAdded,
    selectedModels,
    noPhotoModels,
    appliedAt,
  };
}

function auditResult(staged) {
  return {
    model_id: staged.supplement.model_id,
    page_title: staged.supplement.page_title,
    decision: staged.supplement.decision,
    candidate_id: staged.id,
    source_page_url: staged.sourcePageUrl,
    source_original_url: staged.sourceOriginalUrl,
    commons_sha1: staged.commonsSha1,
    sha256: staged.sha256,
    bytes: staged.stagedBytes,
    width: staged.width,
    height: staged.height,
    author: staged.author,
    author_raw_html: staged.authorRawHtml,
    credit: staged.credit,
    credit_raw_html: staged.creditRawHtml,
    license: staged.license,
    license_family: staged.licenseFamily,
    license_url: staged.licenseUrl,
    license_url_source: staged.licenseUrlSource,
    usage_terms: staged.usageTerms,
    attribution_required: staged.attributionRequired,
    attribution: staged.attribution,
    description: staged.description,
    original_filename: staged.originalFilename,
    explicit_year: staged.explicitYear,
    identity_term_matched: staged.supplementIdentityMatch,
    evidence_note: staged.supplement.evidence_note,
    local_path: staged.localPath,
    raw_source_record_paths: staged.supplementRawFiles,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const [catalog, manifest, plan] = await Promise.all(
    [options.catalog, options.manifest, options.plan].map(async (file) =>
      JSON.parse(await readFile(file, "utf8")),
    ),
  );
  const models = validatePlan(plan, catalog, options);
  const allCandidates = flattenCandidates(plan);
  const candidates = allCandidates.filter(
    (candidate) => candidate.decision !== "rejected",
  );
  await mkdir(options.assetDir, { recursive: true });
  const { pages, rawFiles } = await fetchExactPages(allCandidates, options);
  const pagesByTitle = new Map(pages.map((page) => [pageMapKey(page.title), page]));
  const normalized = candidates.map((record) => {
    const page = pagesByTitle.get(pageMapKey(record.page_title));
    if (!page || page.missing) {
      throw new Error(`Commons did not return ${record.page_title}`);
    }
    return normalizeCandidate(
      record,
      page,
      models.get(record.model_id),
      options,
      rawFiles,
    );
  });

  const runStats = { downloadedAssets: 0, reusedAssets: 0 };
  const staged = [];
  for (const [index, candidate] of normalized.entries()) {
    const result = await stageCandidate(candidate, options, runStats);
    await verifyCommonsSha1(result);
    staged.push(result);
    console.log(
      `[${index + 1}/${normalized.length}] ${candidate.supplement.model_id}: ${candidate.originalFilename}`,
    );
  }

  const stats = await stagedDirectoryStats(options.assetDir);
  if (!options.apply) {
    const stageReport = path.join(path.dirname(options.rawDir), "stage-audit.json");
    await writeJsonAtomic(stageReport, {
      schema_version: 1,
      generated_at: new Date().toISOString(),
      mode: "stage-only",
      source_plan: relativePath(options.root, options.plan),
      full_raw_source_record_paths: rawFiles,
      release_upload_performed: false,
      candidates: staged.map(auditResult),
    });
    console.log(
      JSON.stringify(
        {
          mode: "stage-only",
          staged_candidates: staged.length,
          selected_candidates: staged.filter(
            (candidate) => candidate.supplement.decision === "selected",
          ).length,
          visual_review_candidates: staged.filter(
            (candidate) => candidate.supplement.decision === "review",
          ).length,
          downloaded_assets: runStats.downloadedAssets,
          reused_assets: runStats.reusedAssets,
          raw_source_record_paths: rawFiles,
          stage_report: relativePath(options.root, stageReport),
          staging_directory_file_count: stats.count,
          staging_directory_total_bytes: stats.bytes,
        },
        null,
        2,
      ),
    );
    return;
  }

  const selected = staged.filter(
    (candidate) => candidate.supplement.decision === "selected",
  );
  const merge = mergeIntoManifest(manifest, selected, plan, options);
  plan.generated_at = merge.appliedAt;
  plan.results = {
    applied_at: merge.appliedAt,
    candidates_staged: staged.length,
    candidates_selected: selected.length,
    unique_assets_added: merge.assetsAdded,
    selected_model_ids: merge.selectedModels,
    models_still_without_exact_photo: merge.noPhotoModels,
    full_raw_source_record_paths: rawFiles,
    release_upload_performed:
      manifest.coverage_supplement.release_upload_performed,
    candidates: staged.map(auditResult),
  };
  await writeJsonAtomic(options.manifest, manifest);
  await writeJsonAtomic(options.plan, plan);
  console.log(
    JSON.stringify(
      {
        mode: "applied",
        manifest: relativePath(options.root, options.manifest),
        supplement: relativePath(options.root, options.plan),
        selected_models: merge.selectedModels.length,
        selected_assets: selected.length,
        unique_assets_added: merge.assetsAdded,
        models_still_without_exact_photo: merge.noPhotoModels.length,
        downloaded_assets: runStats.downloadedAssets,
        reused_assets: runStats.reusedAssets,
        raw_source_record_paths: rawFiles,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error?.stack ?? error);
  process.exitCode = 1;
});

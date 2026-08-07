#!/usr/bin/env node

import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildTitlesUrl,
  fetchWithRetry,
  makeCandidate,
  normalizedText,
  stageCandidate,
  writeJsonAtomic,
} from "./crawl-wikimedia-release-photos.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_QUEUE = "data/photos/current-model-color-photo-crawl-queue.json";
const DEFAULT_CATALOG = "data/catalog/chevrolet-us-nameplates.json";
const DEFAULT_ASSET_DIR = "tmp/current-model-color-photo-review/originals";
const DEFAULT_RAW_RESPONSE =
  "tmp/current-model-color-photo-review/commons-api-response.json";
const DEFAULT_MANIFEST =
  "tmp/current-model-color-photo-review/review-manifest.json";
const DEFAULT_MAX_BYTES = 80_000_000;

function printHelp() {
  console.log(`Usage: node scripts/stage-current-model-color-photo-queue.mjs [options]

Fetches the exact Wikimedia Commons pages already retained in the current-model
color-photo queue, revalidates rights and exact model-year metadata, downloads
the original bytes, and writes a review manifest. It does not upload anything.

Options:
  --queue PATH          Reviewed discovery queue
  --catalog PATH        Chevrolet U.S. nameplate catalog
  --asset-dir PATH      Ignored original staging directory
  --raw-response PATH   Complete retained Commons API response
  --manifest PATH       Review manifest output
  --max-bytes N         Per-original byte limit (default 80000000)
  --refresh             Redownload existing staged originals
  -h, --help            Show this help`);
}

function resolveInsideRoot(value, label) {
  const resolved = path.resolve(ROOT, value);
  const relative = path.relative(ROOT, resolved);
  if (
    relative === "" ||
    (!relative.startsWith(`..${path.sep}`) &&
      relative !== ".." &&
      !path.isAbsolute(relative))
  ) {
    return resolved;
  }
  throw new Error(`${label} must stay within the repository: ${value}`);
}

function parseArgs(argv) {
  const options = {
    queue: resolveInsideRoot(DEFAULT_QUEUE, "queue"),
    catalog: resolveInsideRoot(DEFAULT_CATALOG, "catalog"),
    assetDir: resolveInsideRoot(DEFAULT_ASSET_DIR, "asset directory"),
    rawResponse: resolveInsideRoot(DEFAULT_RAW_RESPONSE, "raw response"),
    manifest: resolveInsideRoot(DEFAULT_MANIFEST, "manifest"),
    maxBytes: DEFAULT_MAX_BYTES,
    refresh: false,
    releaseTag: "photo-archive-v1",
    owner: "ipadmom",
    repository: "chevrolet-color-archive",
  };
  const paths = new Map([
    ["--queue", "queue"],
    ["--catalog", "catalog"],
    ["--asset-dir", "assetDir"],
    ["--raw-response", "rawResponse"],
    ["--manifest", "manifest"],
  ]);
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--help" || argument === "-h") {
      printHelp();
      return null;
    }
    if (argument === "--refresh") {
      options.refresh = true;
      continue;
    }
    if (argument === "--max-bytes") {
      const value = Number(argv[++index]);
      if (!Number.isSafeInteger(value) || value < 1) {
        throw new Error("--max-bytes must be a positive integer");
      }
      options.maxBytes = value;
      continue;
    }
    const key = paths.get(argument);
    if (!key) throw new Error(`Unknown option: ${argument}`);
    const value = argv[++index];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for ${argument}`);
    }
    options[key] = resolveInsideRoot(value, argument);
  }
  return options;
}

function titleFromSourcePage(value) {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.hostname !== "commons.wikimedia.org") {
    throw new Error(`Queue source is not a Wikimedia Commons page: ${value}`);
  }
  const prefix = "/wiki/";
  if (!url.pathname.startsWith(prefix)) {
    throw new Error(`Queue source has no Commons wiki title: ${value}`);
  }
  const title = decodeURIComponent(url.pathname.slice(prefix.length));
  if (!/^File:/i.test(title)) {
    throw new Error(`Queue source is not a Commons File page: ${value}`);
  }
  return title;
}

function titleKey(value) {
  return String(value).replaceAll("_", " ").trim().toLocaleLowerCase("en-US");
}

function relativePath(value) {
  return path.relative(ROOT, value).replaceAll(path.sep, "/");
}

function manifestAsset(staged, queueItem, rawResponsePath) {
  return {
    candidate_id: staged.id,
    status: "pending_visual_review",
    selection_kinds: ["exact_year_color_example"],
    selection_contexts: [
      {
        kind: "exact_year_color_example",
        model_id: queueItem.model_id,
        exact_year: queueItem.model_year,
        color_label: queueItem.color_label,
        queue_candidate_key: queueItem.candidate_key,
        palette_source_id: queueItem.palette_source_id,
        palette_source_url: queueItem.palette_source_url,
        palette_locator: queueItem.palette_locator,
      },
    ],
    model_ids: [queueItem.model_id],
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
    commons_raw_record_paths: [rawResponsePath],
    color_label: queueItem.color_label,
    metadata_evidence: queueItem.metadata_evidence,
    review_state: queueItem.review_state,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!options) return;
  await Promise.all([
    mkdir(options.assetDir, { recursive: true }),
    mkdir(path.dirname(options.rawResponse), { recursive: true }),
    mkdir(path.dirname(options.manifest), { recursive: true }),
  ]);
  const [queue, catalog] = await Promise.all([
    readFile(options.queue, "utf8").then((value) => JSON.parse(value)),
    readFile(options.catalog, "utf8").then((value) => JSON.parse(value)),
  ]);
  if (!Array.isArray(queue.queued_candidates) || queue.queued_candidates.length === 0) {
    throw new Error("Queue has no candidates");
  }
  const models = new Map(catalog.models.map((model) => [model.id, model]));
  const titles = queue.queued_candidates.map((item) =>
    titleFromSourcePage(item.source_page_url),
  );
  if (new Set(titles.map(titleKey)).size !== titles.length) {
    throw new Error("Queue contains duplicate Commons file titles");
  }

  const response = await fetchWithRetry(buildTitlesUrl(titles).href);
  const raw = await response.json();
  const pages = raw.query?.pages ?? [];
  const pagesByTitle = new Map(pages.map((page) => [titleKey(page.title), page]));
  if (pagesByTitle.size !== titles.length) {
    throw new Error(
      `Commons returned ${pagesByTitle.size} pages for ${titles.length} queued titles`,
    );
  }
  await writeJsonAtomic(options.rawResponse, raw);

  const runStats = { downloadedAssets: 0, reusedAssets: 0 };
  const assets = [];
  const seenCandidateIds = new Set();
  for (let index = 0; index < queue.queued_candidates.length; index += 1) {
    const item = queue.queued_candidates[index];
    const title = titles[index];
    const page = pagesByTitle.get(titleKey(title));
    const model = models.get(item.model_id);
    if (!model) throw new Error(`Queue model is absent from catalog: ${item.model_id}`);
    const normalized = makeCandidate(
      page,
      model,
      `exact Commons page title: ${title}`,
      "exact_year",
      item.model_year,
      options,
    );
    if (!normalized.candidate) {
      throw new Error(`${item.candidate_key} failed the crawler gate: ${normalized.rejected}`);
    }
    const candidate = normalized.candidate;
    const description = normalizedText(candidate.description);
    if (!description.includes(normalizedText(item.color_label))) {
      throw new Error(`${item.candidate_key} metadata omits ${item.color_label}`);
    }
    if (!description.includes(normalizedText(item.metadata_evidence))) {
      throw new Error(`${item.candidate_key} metadata evidence drifted`);
    }
    const staged = await stageCandidate(candidate, options, runStats);
    if (seenCandidateIds.has(staged.id)) {
      throw new Error(`Queue resolved to duplicate Commons bytes: ${staged.id}`);
    }
    seenCandidateIds.add(staged.id);
    assets.push(manifestAsset(staged, item, relativePath(options.rawResponse)));
  }

  const manifest = {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    scope:
      "Exact-year current Chevrolet color-photo candidates retained for visual review before publication.",
    provider: {
      name: "Wikimedia Commons",
      api: "https://commons.wikimedia.org/w/api.php",
    },
    github_release: {
      owner: options.owner,
      repository: options.repository,
      tag: options.releaseTag,
      published: false,
      base_url:
        `https://github.com/${options.owner}/${options.repository}/releases/download/` +
        `${options.releaseTag}/`,
    },
    policy: queue.policy,
    run: {
      queued_candidates: queue.queued_candidates.length,
      api_pages: pages.length,
      downloaded_assets: runStats.downloadedAssets,
      reused_assets: runStats.reusedAssets,
      staged_asset_count: assets.length,
      staged_total_bytes: assets.reduce((sum, asset) => sum + asset.bytes, 0),
      staged_directory: relativePath(options.assetDir),
      complete_api_response: relativePath(options.rawResponse),
    },
    assets,
  };
  await writeJsonAtomic(options.manifest, manifest);
  console.log(
    JSON.stringify({
      manifest: relativePath(options.manifest),
      assets: assets.length,
      downloaded: runStats.downloadedAssets,
      reused: runStats.reusedAssets,
      bytes: manifest.run.staged_total_bytes,
    }),
  );
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))
) {
  main().catch((error) => {
    console.error(error?.stack ?? error);
    process.exitCode = 1;
  });
}

export { parseArgs, titleFromSourcePage, titleKey };

#!/usr/bin/env node

import { createHash, randomUUID } from "node:crypto";
import {
  link,
  mkdir,
  readFile,
  rename,
  stat,
  unlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const REPOSITORY_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const DEFAULT_MAX_WIDTH = 1600;
const DEFAULT_MAX_HEIGHT = 1200;
const DEFAULT_QUALITY = 82;
const DEFAULT_CONCURRENCY = 2;

function printHelp() {
  console.log(`Usage: node scripts/build-release-photo-previews.mjs [options]

Verifies every staged Wikimedia Commons original against the release manifest,
then creates deterministic still WebP previews for the same pinned GitHub
Release. The original archive asset and source URLs remain unchanged.

Options:
  --root PATH          Root used to resolve manifest-local paths
  --manifest PATH      Commons release manifest
  --asset-dir PATH     Ignored preview staging directory
  --max-width N        Maximum preview width (default 1600)
  --max-height N       Maximum preview height (default 1200)
  --quality N          WebP quality, 1 through 100 (default 82)
  --concurrency N      Parallel preview workers, 1 through 8 (default 2)
  --owner OWNER        Override the manifest GitHub owner
  --repository REPO    Override the manifest GitHub repository
  --release-tag TAG    Override the manifest GitHub Release tag
  -h, --help           Show this help

The command never downloads or uploads files. It refuses to overwrite an
existing preview unless its bytes already match the deterministic output.`);
}

function parsePositiveInteger(value, option, maximum = Number.MAX_SAFE_INTEGER) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > maximum) {
    throw new Error(`${option} must be an integer from 1 through ${maximum}`);
  }
  return parsed;
}

function parseArgs(argv) {
  const raw = {
    root: REPOSITORY_ROOT,
    manifest: "data/photos/commons-release-manifest.json",
    assetDir: "tmp/commons-release-previews",
    maxWidth: DEFAULT_MAX_WIDTH,
    maxHeight: DEFAULT_MAX_HEIGHT,
    quality: DEFAULT_QUALITY,
    concurrency: DEFAULT_CONCURRENCY,
    owner: null,
    repository: null,
    releaseTag: null,
  };
  const stringOptions = new Map([
    ["--root", "root"],
    ["--manifest", "manifest"],
    ["--asset-dir", "assetDir"],
    ["--owner", "owner"],
    ["--repository", "repository"],
    ["--release-tag", "releaseTag"],
  ]);
  const numericOptions = new Map([
    ["--max-width", ["maxWidth", Number.MAX_SAFE_INTEGER]],
    ["--max-height", ["maxHeight", Number.MAX_SAFE_INTEGER]],
    ["--quality", ["quality", 100]],
    ["--concurrency", ["concurrency", 8]],
  ]);

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--help" || argument === "-h") {
      printHelp();
      return null;
    }
    const stringKey = stringOptions.get(argument);
    const numeric = numericOptions.get(argument);
    if (!stringKey && !numeric) throw new Error(`Unknown option: ${argument}`);
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`Missing value for ${argument}`);
    }
    index += 1;
    if (stringKey) {
      raw[stringKey] = value;
    } else {
      const [numericKey, maximum] = numeric;
      raw[numericKey] = parsePositiveInteger(value, argument, maximum);
    }
  }

  raw.root = path.resolve(raw.root);
  raw.manifest = resolveInsideRoot(raw.root, raw.manifest, "manifest");
  raw.assetDir = resolveInsideRoot(raw.root, raw.assetDir, "asset directory");
  for (const key of ["owner", "repository", "releaseTag"]) {
    if (raw[key] !== null && !String(raw[key]).trim()) {
      throw new Error(`--${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)} cannot be empty`);
    }
  }
  return raw;
}

function resolveInsideRoot(root, value, label) {
  const resolved = path.resolve(root, value);
  const relative = path.relative(root, resolved);
  if (relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative))) {
    return resolved;
  }
  throw new Error(`${label} must stay within --root: ${value}`);
}

function relativePath(root, value) {
  return path.relative(root, value).split(path.sep).join("/");
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function requireSha256(value, candidateId) {
  const normalized = String(value ?? "").toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(normalized)) {
    throw new Error(`${candidateId} has no valid original SHA-256`);
  }
  return normalized;
}

function safeCandidateId(value, index) {
  const safe = String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
  return safe || `asset-${index + 1}`;
}

function releaseAssetUrl(owner, repository, releaseTag, assetName) {
  return (
    `https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}` +
    `/releases/download/${encodeURIComponent(releaseTag)}/${encodeURIComponent(assetName)}`
  );
}

async function writeExclusiveAsset(destination, bytes, expectedSha256) {
  try {
    const existing = await readFile(destination);
    const existingSha256 = sha256(existing);
    if (existingSha256 !== expectedSha256) {
      throw new Error(
        `Refusing to overwrite existing preview with different bytes: ${destination}`,
      );
    }
    return "reused";
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }

  const temporary = `${destination}.tmp-${process.pid}-${randomUUID()}`;
  await writeFile(temporary, bytes, { flag: "wx" });
  try {
    await link(temporary, destination);
  } catch (error) {
    if (error?.code !== "EEXIST") throw error;
    const existing = await readFile(destination);
    if (sha256(existing) !== expectedSha256) {
      throw new Error(
        `Refusing to overwrite existing preview with different bytes: ${destination}`,
      );
    }
    return "reused";
  } finally {
    await unlink(temporary).catch(() => {});
  }
  return "generated";
}

async function renderPreview(asset, index, options, release) {
  const candidateId = String(asset.candidate_id ?? `asset-${index + 1}`);
  if (!asset.local_path || typeof asset.local_path !== "string") {
    throw new Error(`${candidateId} has no staged original local_path`);
  }
  const originalPath = resolveInsideRoot(
    options.root,
    asset.local_path,
    `${candidateId} original`,
  );
  const expectedBytes = Number(asset.bytes);
  if (!Number.isSafeInteger(expectedBytes) || expectedBytes < 1) {
    throw new Error(`${candidateId} has no valid original byte count`);
  }
  const expectedSha256 = requireSha256(asset.sha256, candidateId);
  const [fileInfo, original] = await Promise.all([
    stat(originalPath),
    readFile(originalPath),
  ]);
  if (!fileInfo.isFile()) throw new Error(`${candidateId} original is not a file`);
  if (fileInfo.size !== expectedBytes || original.length !== expectedBytes) {
    throw new Error(
      `${candidateId} original byte mismatch: manifest ${expectedBytes}, local ${original.length}`,
    );
  }
  const actualOriginalSha256 = sha256(original);
  if (actualOriginalSha256 !== expectedSha256) {
    throw new Error(
      `${candidateId} original SHA-256 mismatch: expected ${expectedSha256}, got ${actualOriginalSha256}`,
    );
  }

  const { data, info } = await sharp(original, {
    animated: false,
    failOn: "error",
    sequentialRead: true,
  })
    .rotate()
    .resize({
      width: options.maxWidth,
      height: options.maxHeight,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({
      quality: options.quality,
      alphaQuality: 90,
      effort: 4,
      smartSubsample: true,
    })
    .toBuffer({ resolveWithObject: true });
  if (info.format !== "webp") throw new Error(`${candidateId} did not render as WebP`);
  if (info.width > options.maxWidth || info.height > options.maxHeight) {
    throw new Error(`${candidateId} preview exceeds the configured bounds`);
  }

  const previewSha256 = sha256(data);
  const previewName =
    `preview-${safeCandidateId(candidateId, index)}-${previewSha256.slice(0, 16)}.webp`;
  const previewPath = path.join(options.assetDir, previewName);
  const disposition = await writeExclusiveAsset(previewPath, data, previewSha256);
  const previewUrl = releaseAssetUrl(
    release.owner,
    release.repository,
    release.tag,
    previewName,
  );

  return {
    disposition,
    originalBytes: original.length,
    previewBytes: data.length,
    fields: {
      preview_sha256: previewSha256,
      preview_bytes: data.length,
      preview_width: info.width,
      preview_height: info.height,
      preview_mime: "image/webp",
      preview_local_path: relativePath(options.root, previewPath),
      preview_release_asset_name: previewName,
      preview_release_asset_url: previewUrl,
      site_asset_url: previewUrl,
    },
  };
}

async function mapLimit(items, limit, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;
  async function worker() {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= items.length) return;
      results[index] = await mapper(items[index], index);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, Math.max(items.length, 1)) }, worker),
  );
  return results;
}

async function writeJsonAtomic(file, value) {
  const temporary = `${file}.tmp-${process.pid}-${randomUUID()}`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx",
  });
  try {
    await rename(temporary, file);
  } catch (error) {
    await unlink(temporary).catch(() => {});
    throw error;
  }
}

function requiredReleaseIdentity(manifest, options) {
  const owner = String(options.owner ?? manifest.github_release?.owner ?? "").trim();
  const repository = String(
    options.repository ?? manifest.github_release?.repository ?? "",
  ).trim();
  const tag = String(options.releaseTag ?? manifest.github_release?.tag ?? "").trim();
  if (!owner || !repository || !tag) {
    throw new Error(
      "GitHub owner, repository, and release tag are required in the manifest or CLI",
    );
  }
  return { owner, repository, tag };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!options) return;
  const startedAt = new Date().toISOString();
  const manifest = JSON.parse(await readFile(options.manifest, "utf8"));
  if (!Array.isArray(manifest.assets) || manifest.assets.length === 0) {
    throw new Error("Manifest assets must be a non-empty array");
  }
  const candidateIds = new Set();
  for (const [index, asset] of manifest.assets.entries()) {
    const candidateId = String(asset.candidate_id ?? `asset-${index + 1}`);
    if (candidateIds.has(candidateId)) {
      throw new Error(`Duplicate candidate_id in manifest: ${candidateId}`);
    }
    candidateIds.add(candidateId);
  }

  const release = requiredReleaseIdentity(manifest, options);
  await mkdir(options.assetDir, { recursive: true });
  const results = await mapLimit(
    manifest.assets,
    options.concurrency,
    (asset, index) => renderPreview(asset, index, options, release),
  );
  manifest.assets = manifest.assets.map((asset, index) => ({
    ...asset,
    ...results[index].fields,
  }));

  const originalTotalBytes = results.reduce(
    (sum, result) => sum + result.originalBytes,
    0,
  );
  const previewTotalBytes = results.reduce(
    (sum, result) => sum + result.previewBytes,
    0,
  );
  const finishedAt = new Date().toISOString();
  manifest.policy ??= {};
  manifest.policy.site_url_field = "site_asset_url";
  manifest.policy.preview_assets = {
    required_for_site_delivery: true,
    format: "image/webp",
    quality: options.quality,
    max_width: options.maxWidth,
    max_height: options.maxHeight,
    without_enlargement: true,
    exif_autorotate: true,
    animated_inputs: "first still frame only",
    pinned_github_release_urls: true,
    original_release_assets_preserved: true,
    collision_policy: "reuse identical bytes; refuse different bytes",
  };
  manifest.run ??= {};
  manifest.run.preview_assets = {
    started_at: startedAt,
    finished_at: finishedAt,
    input_asset_count: results.length,
    generated_asset_count: results.filter(
      (result) => result.disposition === "generated",
    ).length,
    reused_asset_count: results.filter(
      (result) => result.disposition === "reused",
    ).length,
    verified_original_count: results.length,
    original_total_bytes: originalTotalBytes,
    preview_total_bytes: previewTotalBytes,
    bytes_saved: originalTotalBytes - previewTotalBytes,
    percent_reduction: Number(
      ((1 - previewTotalBytes / originalTotalBytes) * 100).toFixed(2),
    ),
    staged_directory: relativePath(options.root, options.assetDir),
    release_owner: release.owner,
    release_repository: release.repository,
    release_tag: release.tag,
  };

  await writeJsonAtomic(options.manifest, manifest);
  console.log(
    JSON.stringify(
      {
        manifest: relativePath(options.root, options.manifest),
        preview_asset_count: results.length,
        generated_asset_count: manifest.run.preview_assets.generated_asset_count,
        reused_asset_count: manifest.run.preview_assets.reused_asset_count,
        preview_total_bytes: previewTotalBytes,
        percent_reduction: manifest.run.preview_assets.percent_reduction,
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

#!/usr/bin/env node

import { createHash } from "node:crypto";
import {
  lstat,
  readFile,
  readdir,
  realpath,
  rmdir,
  stat,
  unlink,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MANIFEST = "data/photos/commons-release-manifest.json";
const REVIEW = "data/photos/current-model-color-photo-review.json";
const DURABLE_RAW =
  "data/photos/source-records/current-model-color-photo-commons-api-2026-08-07.json";
const DURABLE_RECEIPT =
  "data/photos/current-model-color-photo-release-verification.json";
const REVIEW_COPY_ROOT = "tmp/current-model-color-photo-review-vps";
const ALLOWED_ORIGINAL_PARENTS = new Set([
  "tmp/commons-release-assets",
  "tmp/current-model-color-photo-review/originals",
]);
const ALLOWED_PREVIEW_PARENTS = new Set([
  "tmp/commons-release-previews",
  "tmp/current-model-color-photo-review/previews",
]);

function resolveInsideRoot(value) {
  const resolved = path.resolve(ROOT, value);
  const relative = path.relative(ROOT, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Path leaves repository: ${value}`);
  }
  return resolved;
}

function digest(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function allowedParentFor(relativePath, allowedParents) {
  const normalizedParent = path.dirname(relativePath).replaceAll(path.sep, "/");
  if (!allowedParents.has(normalizedParent)) {
    throw new Error(`Manifest points outside approved staging: ${relativePath}`);
  }
  return normalizedParent;
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(resolveInsideRoot(relativePath), "utf8"));
}

async function exists(relativePath) {
  try {
    await stat(resolveInsideRoot(relativePath));
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

async function verifyFile(relativePath, expectedBytes, expectedSha256, allowedParent) {
  const file = resolveInsideRoot(relativePath);
  let fileStat;
  try {
    fileStat = await stat(file);
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
  const fileLstat = await lstat(file);
  const resolvedParent = path.dirname(await realpath(file));
  if (
    resolvedParent !== resolveInsideRoot(allowedParent) ||
    !fileStat.isFile() ||
    fileLstat.isSymbolicLink()
  ) {
    throw new Error(`Refusing unexpected staging path: ${relativePath}`);
  }
  const bytes = await readFile(file);
  if (bytes.length !== expectedBytes || digest(bytes) !== expectedSha256) {
    throw new Error(`Staging digest mismatch: ${relativePath}`);
  }
  return file;
}

async function verifiedCopy(leftRelative, rightRelative, expectedSha256 = null) {
  const [left, right] = await Promise.all([
    readFile(resolveInsideRoot(leftRelative)),
    readFile(resolveInsideRoot(rightRelative)),
  ]);
  const leftSha = digest(left);
  if (left.length !== right.length || leftSha !== digest(right)) {
    throw new Error(`Durable copy mismatch: ${leftRelative}`);
  }
  if (expectedSha256 && leftSha !== expectedSha256) {
    throw new Error(`Recorded staging digest mismatch: ${leftRelative}`);
  }
  return resolveInsideRoot(leftRelative);
}

async function main() {
  const apply = process.argv.slice(2).includes("--apply");
  const [manifest, review] = await Promise.all([
    readJson(MANIFEST),
    readJson(REVIEW),
  ]);
  if (!manifest.github_release?.published || !Array.isArray(manifest.assets)) {
    throw new Error("Canonical photo Release manifest is not published");
  }
  const files = new Set();
  for (const asset of manifest.assets) {
    const original = await verifyFile(
      asset.local_path,
      asset.bytes,
      asset.sha256,
      allowedParentFor(asset.local_path, ALLOWED_ORIGINAL_PARENTS),
    );
    if (original) files.add(original);
    const preview = await verifyFile(
      asset.preview_local_path,
      asset.preview_bytes,
      asset.preview_sha256,
      allowedParentFor(asset.preview_local_path, ALLOWED_PREVIEW_PARENTS),
    );
    if (preview) files.add(preview);
  }

  const reviewCopyPresent = await exists(REVIEW_COPY_ROOT);
  if (reviewCopyPresent) {
    const staging = await readJson(`${REVIEW_COPY_ROOT}/review-manifest.json`);
    for (const asset of staging.assets) {
      const copiedPreview = await verifyFile(
        `${REVIEW_COPY_ROOT}/previews/${asset.preview_release_asset_name}`,
        asset.preview_bytes,
        asset.preview_sha256,
        `${REVIEW_COPY_ROOT}/previews`,
      );
      if (copiedPreview) files.add(copiedPreview);
    }
    files.add(
      await verifiedCopy(
        `${REVIEW_COPY_ROOT}/commons-api-response.json`,
        DURABLE_RAW,
        review.source_records.complete_commons_api_response_sha256,
      ),
    );
    files.add(
      await verifiedCopy(
        `${REVIEW_COPY_ROOT}/release-verification.json`,
        DURABLE_RECEIPT,
        review.source_records.release_verification_receipt_sha256,
      ),
    );
    const stagingManifest = resolveInsideRoot(
      `${REVIEW_COPY_ROOT}/review-manifest.json`,
    );
    const stagingManifestBytes = await readFile(stagingManifest);
    if (
      digest(stagingManifestBytes) !==
      review.source_records.staging_manifest_sha256
    ) {
      throw new Error("Recorded staging manifest digest mismatch");
    }
    files.add(stagingManifest);
  }

  const bytes = (
    await Promise.all([...files].map(async (file) => (await stat(file)).size))
  ).reduce((sum, value) => sum + value, 0);
  if (apply) {
    for (const file of files) await unlink(file);
    if (reviewCopyPresent) {
      const previewDirectory = resolveInsideRoot(`${REVIEW_COPY_ROOT}/previews`);
      if ((await readdir(previewDirectory)).length === 0) await rmdir(previewDirectory);
      const reviewDirectory = resolveInsideRoot(REVIEW_COPY_ROOT);
      if ((await readdir(reviewDirectory)).length === 0) await rmdir(reviewDirectory);
    }
  }
  console.log(
    JSON.stringify({
      mode: apply ? "deleted" : "checked",
      verified_files: files.size,
      verified_bytes: bytes,
      deleted_files: apply ? files.size : 0,
    }),
  );
}

main().catch((error) => {
  console.error(error?.stack ?? error);
  process.exitCode = 1;
});

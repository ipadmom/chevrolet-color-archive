import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import test from "node:test";
import sharp from "sharp";

const execFileAsync = promisify(execFile);
const repositoryRoot = path.resolve(fileURLToPath(new URL("../", import.meta.url)));
const script = path.join(repositoryRoot, "scripts", "build-release-photo-previews.mjs");

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function runBuilder(root, manifest, previewDirectory) {
  return execFileAsync(
    process.execPath,
    [
      script,
      "--root",
      root,
      "--manifest",
      manifest,
      "--asset-dir",
      previewDirectory,
      "--max-width",
      "1600",
      "--max-height",
      "1200",
      "--quality",
      "82",
      "--concurrency",
      "1",
    ],
    { cwd: repositoryRoot },
  );
}

test("release previews are verified, deterministic, pinned, and collision safe", async () => {
  const testRootParent = path.join(repositoryRoot, "tmp");
  await mkdir(testRootParent, { recursive: true });
  const root = await mkdtemp(path.join(testRootParent, "release-preview-test-"));

  try {
    const originals = path.join(root, "originals");
    const previewDirectory = path.join(root, "previews");
    await mkdir(originals, { recursive: true });
    const originalPath = path.join(originals, "oriented-source.jpg");
    const original = await sharp({
      create: {
        width: 1800,
        height: 2400,
        channels: 3,
        background: { r: 36, g: 92, b: 148 },
      },
    })
      .jpeg({ quality: 91 })
      .withMetadata({ orientation: 6 })
      .toBuffer();
    await writeFile(originalPath, original, { flag: "wx" });

    const manifestPath = path.join(root, "manifest.json");
    const originalReleaseUrl =
      "https://github.com/ipadmom/chevrolet-color-archive/releases/download/photo-archive-v1/original.jpg";
    const sourceUrl = "https://upload.wikimedia.org/example/original.jpg";
    await writeFile(
      manifestPath,
      `${JSON.stringify(
        {
          schema_version: 1,
          github_release: {
            owner: "ipadmom",
            repository: "chevrolet-color-archive",
            tag: "photo-archive-v1",
          },
          policy: {
            hotlinks_allowed: false,
            site_url_field: "site_asset_url",
          },
          run: {},
          assets: [
            {
              candidate_id: "commons-test-oriented-photo",
              source_original_url: sourceUrl,
              release_asset_name: "original.jpg",
              release_asset_url: originalReleaseUrl,
              site_asset_url: originalReleaseUrl,
              local_path: "originals/oriented-source.jpg",
              sha256: sha256(original),
              bytes: original.length,
              width: 1800,
              height: 2400,
              mime: "image/jpeg",
            },
          ],
        },
        null,
        2,
      )}\n`,
      { encoding: "utf8", flag: "wx" },
    );

    const first = await runBuilder(root, manifestPath, previewDirectory);
    assert.match(first.stdout, /"generated_asset_count": 1/);
    const updated = JSON.parse(await readFile(manifestPath, "utf8"));
    const asset = updated.assets[0];
    assert.equal(asset.release_asset_url, originalReleaseUrl);
    assert.equal(asset.source_original_url, sourceUrl);
    assert.equal(asset.preview_mime, "image/webp");
    assert.match(asset.preview_sha256, /^[a-f0-9]{64}$/);
    assert.match(
      asset.preview_release_asset_name,
      /^preview-commons-test-oriented-photo-[a-f0-9]{16}\.webp$/,
    );
    assert.equal(
      asset.preview_release_asset_url,
      `https://github.com/ipadmom/chevrolet-color-archive/releases/download/photo-archive-v1/${asset.preview_release_asset_name}`,
    );
    assert.equal(asset.site_asset_url, asset.preview_release_asset_url);
    assert.equal(asset.preview_local_path, `previews/${asset.preview_release_asset_name}`);
    assert.equal(updated.policy.preview_assets.required_for_site_delivery, true);
    assert.equal(updated.policy.preview_assets.original_release_assets_preserved, true);
    assert.equal(updated.run.preview_assets.generated_asset_count, 1);
    assert.equal(updated.run.preview_assets.verified_original_count, 1);

    const previewPath = path.join(root, asset.preview_local_path);
    await access(previewPath);
    const preview = await readFile(previewPath);
    const previewMetadata = await sharp(preview).metadata();
    assert.equal(sha256(preview), asset.preview_sha256);
    assert.equal(preview.length, asset.preview_bytes);
    assert.equal(previewMetadata.format, "webp");
    assert.equal(previewMetadata.width, 1600);
    assert.equal(previewMetadata.height, 1200);
    assert.equal(previewMetadata.orientation, undefined);

    const second = await runBuilder(root, manifestPath, previewDirectory);
    assert.match(second.stdout, /"reused_asset_count": 1/);
    const rerun = JSON.parse(await readFile(manifestPath, "utf8"));
    assert.equal(rerun.assets[0].preview_sha256, asset.preview_sha256);
    assert.equal(rerun.assets[0].preview_release_asset_name, asset.preview_release_asset_name);

    const collision = Buffer.from("different bytes must never be overwritten");
    await writeFile(previewPath, collision);
    await assert.rejects(
      runBuilder(root, manifestPath, previewDirectory),
      /Refusing to overwrite existing preview with different bytes/,
    );
    assert.deepEqual(await readFile(previewPath), collision);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("release preview builder exposes a side-effect-free help command", async () => {
  const result = await execFileAsync(process.execPath, [script, "--help"], {
    cwd: repositoryRoot,
  });
  assert.match(result.stdout, /--max-width N/);
  assert.match(result.stdout, /refuses to overwrite/i);
});

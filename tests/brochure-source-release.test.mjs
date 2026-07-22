import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { validateBrochureSourceRelease } from "../scripts/validate-brochure-source-release.mjs";

const repositoryRoot = path.resolve(fileURLToPath(new URL("../", import.meta.url)));

test("brochure source Release manifest closes every app-fed citation", async () => {
  const report = await validateBrochureSourceRelease({ repositoryRoot });

  assert.deepEqual(
    {
      ok: report.ok,
      repository: report.repository,
      releaseTag: report.release_tag,
      assetCount: report.asset_count,
      controllingAssetCount: report.controlling_asset_count,
      appFedCitationCount: report.app_fed_citation_count,
      appReleaseUrlCount: report.app_release_url_count,
    },
    {
      ok: true,
      repository: "ipadmom/chevrolet-color-archive",
      releaseTag: "brochure-source-archive-v1",
      assetCount: 110,
      controllingAssetCount: 30,
      appFedCitationCount: 30,
      appReleaseUrlCount: 79,
    },
  );
  assert.ok(["verified", "not-present"].includes(report.local_staging));
  assert.equal(
    report.local_staging_verified_asset_count,
    report.local_staging === "verified" ? 110 : 0,
  );
});

test("brochure source Release validation does not require temporary staging", async () => {
  const missingParent = await mkdtemp(
    path.join(repositoryRoot, "tmp", "missing-brochure-staging-"),
  );
  const missingStaging = path.join(missingParent, "not-created");

  try {
    const report = await validateBrochureSourceRelease({
      repositoryRoot,
      stagingDirectory: missingStaging,
    });
    assert.equal(report.local_staging, "not-present");
    assert.equal(report.local_staging_verified_asset_count, 0);

    await assert.rejects(
      validateBrochureSourceRelease({
        repositoryRoot,
        stagingDirectory: missingStaging,
        requireStaging: true,
      }),
      /required local Release staging directory is missing/,
    );
  } finally {
    await rm(missingParent, { recursive: true, force: true });
  }
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const audit = JSON.parse(
  await readFile(
    new URL("../data/photos/current-model-color-photo-links.json", import.meta.url),
    "utf8",
  ),
);
const manifest = JSON.parse(
  await readFile(
    new URL("../data/photos/commons-release-manifest.json", import.meta.url),
    "utf8",
  ),
);
const modern = JSON.parse(
  await readFile(
    new URL(
      "../data/sources/modern-chevrolet-color-source-candidates.json",
      import.meta.url,
    ),
    "utf8",
  ),
);
const review = JSON.parse(
  await readFile(
    new URL("../data/photos/current-model-color-photo-review.json", import.meta.url),
    "utf8",
  ),
);
const receipt = JSON.parse(
  await readFile(
    new URL(
      "../data/photos/current-model-color-photo-release-verification.json",
      import.meta.url,
    ),
    "utf8",
  ),
);
const rawCommons = JSON.parse(
  await readFile(
    new URL(
      "../data/photos/source-records/current-model-color-photo-commons-api-2026-08-07.json",
      import.meta.url,
    ),
    "utf8",
  ),
);

test("reviewed current-model photo links preserve the exact-year and factory-proof boundary", () => {
  assert.equal(audit.schema_version, 1);
  assert.equal(audit.policy.adjacent_year_inference, false);
  assert.match(audit.policy.factory_paint_boundary, /do not prove original factory finish/);
  assert.ok(audit.links.length > 0);

  for (const link of audit.links) {
    assert.equal(link.visual_review_status, "reviewed");
    assert.equal(link.factory_paint_match_status, "unverified");
    assert.match(link.commons_source_page_url, /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
    assert.match(
      link.archive_original_url,
      /^https:\/\/github\.com\/ipadmom\/chevrolet-color-archive\/releases\/download\/photo-archive-v1\//,
    );

    const asset = manifest.assets.find(({ candidate_id }) => candidate_id === link.photo_id);
    assert.ok(asset, `missing photo asset ${link.photo_id}`);
    assert.equal(asset.commons_sha1, link.commons_sha1);
    assert.equal(asset.sha256, link.sha256);
    assert.equal(asset.width, link.width);
    assert.equal(asset.height, link.height);
    assert.equal(asset.description, link.commons_metadata_evidence);

    const context = asset.selection_contexts.find(
      (item) =>
        item.kind === "reviewed_color_caption" &&
        item.model_id === link.model_id &&
        item.exact_year === link.model_year &&
        item.color_id === link.archive_color_key,
    );
    assert.ok(context, `missing reviewed color context ${link.link_id}`);
    assert.equal(context.legacy_prior_status, "reviewed");
    assert.match(context.legacy_note, /factory-paint identity remains unverified/);

    const palette = modern.verified_palette_tables.find(
      (table) =>
        table.source_id === link.palette_source_id &&
        table.model_year === link.model_year &&
        table.catalog_model_ids.includes(link.model_id),
    );
    assert.ok(palette, `missing exact palette source for ${link.link_id}`);
    assert.ok(palette.colors.includes(link.color_label));
    assert.equal(palette.archive_url, link.palette_source_url);
    assert.equal(palette.page_locator, link.palette_locator);
  }
});

test("current-model color-photo batch retains visual, source, Release, and cleanup proof", () => {
  assert.equal(review.counts.reviewed_photos, 8);
  assert.equal(review.counts.approved_photos, 8);
  assert.equal(review.counts.distinct_photographed_vehicles, 6);
  assert.equal(review.counts.release_assets_verified, 16);
  assert.equal(review.reviews.length, 8);
  assert.ok(review.reviews.every((row) => row.decision === "approved"));
  assert.ok(
    review.reviews.every(
      (row) => row.factory_paint_match_status === "unverified",
    ),
  );

  assert.equal(receipt.github_account, "ipadmom");
  assert.equal(receipt.asset_count, 16);
  assert.equal(receipt.assets.length, 16);
  assert.ok(
    receipt.assets.every(
      (row) =>
        row.verification ===
          "github_reported_size_and_downloaded_sha256_match" &&
        /^[a-f0-9]{64}$/.test(row.sha256),
    ),
  );
  assert.match(receipt.vps_payload_cleanup, /deleted immediately/);

  assert.equal(rawCommons.query.pages.length, 8);
  assert.ok(
    rawCommons.query.pages.every(
      (page) =>
        /^File:/.test(page.title) &&
        /^[a-f0-9]{40}$/.test(page.imageinfo[0].sha1),
    ),
  );
});

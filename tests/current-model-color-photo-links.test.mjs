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

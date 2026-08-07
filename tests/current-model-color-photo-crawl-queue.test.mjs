import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const queue = JSON.parse(
  await readFile(
    new URL(
      "../data/photos/current-model-color-photo-crawl-queue.json",
      import.meta.url,
    ),
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

test("current-model color-photo queue verifies Release bytes and deletes VPS payloads", () => {
  assert.equal(queue.schema_version, 3);
  assert.equal(queue.vps_transfer_policy.persistent_vps_payload, false);
  assert.match(queue.vps_transfer_policy.verification, /byte length and SHA-256/);
  assert.match(queue.vps_transfer_policy.cleanup, /Delete the exact VPS staging/);
  assert.ok(
    queue.policy.required_before_manifest_merge.some((item) =>
      /deleted after successful verification/.test(item),
    ),
  );
});

test("published Commons captions match exact reviewed U.S. palette labels", () => {
  assert.equal(queue.policy.adjacent_year_inference, false);
  assert.match(queue.policy.factory_paint_boundary, /does not prove original factory finish/);
  assert.equal(queue.queued_candidates.length, 0);
  assert.equal(queue.published_candidates.length, 8);

  const keys = new Set();
  for (const candidate of queue.published_candidates) {
    assert.ok(!keys.has(candidate.candidate_key));
    keys.add(candidate.candidate_key);
    assert.match(candidate.source_page_url, /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
    assert.equal(candidate.visual_review_status, "reviewed");
    assert.equal(candidate.factory_paint_match_status, "unverified");
    assert.equal(candidate.release_verification_status, "verified");
    assert.equal(candidate.vps_payload_cleanup_status, "verified_deleted");
    assert.match(candidate.candidate_id, /^commons-sha1-[a-f0-9]{20}$/);
    assert.match(candidate.metadata_evidence, new RegExp(`Finished in ${candidate.color_label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\.$`));

    const palette = modern.verified_palette_tables.find(
      (table) =>
        table.source_id === candidate.palette_source_id &&
        table.model_year === candidate.model_year &&
        table.catalog_model_ids.includes(candidate.model_id),
    );
    assert.ok(palette, `missing palette for ${candidate.candidate_key}`);
    assert.ok(palette.colors.includes(candidate.color_label));
    assert.equal(palette.archive_url, candidate.palette_source_url);
    assert.equal(palette.page_locator, candidate.palette_locator);
  }
});

test("cross-market label collisions stay rejected", () => {
  assert.ok(queue.rejected_or_unresolved.length >= 4);
  assert.ok(
    queue.rejected_or_unresolved.some(
      (item) =>
        item.source_page_url.includes("Trailblazer") &&
        item.source_page_url.includes("Crimson_Metallic") &&
        /Philippine-market/.test(item.reason),
    ),
  );
  assert.ok(
    queue.rejected_or_unresolved.some(
      (item) => /Sharkskin Metallic is not the reviewed U\.S\. source label/.test(item.reason),
    ),
  );
});

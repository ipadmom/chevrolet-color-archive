#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FILES = {
  stagingManifest:
    "tmp/current-model-color-photo-review-vps/review-manifest.json",
  stagingRaw:
    "tmp/current-model-color-photo-review-vps/commons-api-response.json",
  stagingReceipt:
    "tmp/current-model-color-photo-review-vps/release-verification.json",
  manifest: "data/photos/commons-release-manifest.json",
  links: "data/photos/current-model-color-photo-links.json",
  queue: "data/photos/current-model-color-photo-crawl-queue.json",
  audit: "data/photos/current-model-commons-photo-audit.json",
  review: "data/photos/current-model-color-photo-review.json",
  durableRaw:
    "data/photos/source-records/current-model-color-photo-commons-api-2026-08-07.json",
  durableReceipt:
    "data/photos/current-model-color-photo-release-verification.json",
};

const EXPECTED_ASSETS = 8;
const EXPECTED_RELEASE_FILES = EXPECTED_ASSETS * 2;
const COLOR_IDS = new Map([
  ["trax|2024|Cacti Green", "trax-cacti-green-2024-gm-fleet-guide"],
  ["trax|2024|Summit White", "trax-summit-white-2024-gm-fleet-guide"],
  ["trax|2024|Crimson Metallic", "trax-crimson-metallic-2024-gm-fleet-guide"],
  [
    "colorado|2024|Nitro Yellow Metallic",
    "colorado-nitro-yellow-metallic-2024-gm-fleet-guide",
  ],
  ["colorado|2024|Summit White", "colorado-summit-white-2024-gm-fleet-guide"],
  [
    "traverse|2025|Mosaic Black Metallic",
    "traverse-mosaic-black-metallic-2025-gm-fleet-guide",
  ],
]);

const REVIEW = new Map([
  [
    "2024-trax-cacti-green-front-left",
    {
      linkId: "commons-2024-trax-cacti-green-front-left",
      vehicleGroup: "2024-trax-cacti-green-2rs-pa-2023-12-10",
      view: "front left",
      finding:
        "Complete second generation Trax 2RS is visible. The green finish is consistent across the visible panels, with no visible wrap edge or repair mismatch.",
    },
  ],
  [
    "2024-trax-summit-white-front-right",
    {
      linkId: "commons-2024-trax-summit-white-front-right",
      vehicleGroup: "2024-trax-summit-white-ls-pa-2024-05-26",
      view: "front right",
      finding:
        "Complete second generation Trax LS is visible with usable detail in the white panels and no visible wrap edge or repair mismatch.",
    },
  ],
  [
    "2024-trax-summit-white-rear-right",
    {
      linkId: "commons-2024-trax-summit-white-rear-right",
      vehicleGroup: "2024-trax-summit-white-ls-pa-2024-05-26",
      view: "rear right",
      finding:
        "Complete rear quarter of the same Trax LS is visible. The hatch, bumper, and white body panels are clear and consistent with the paired front view.",
    },
  ],
  [
    "2024-trax-crimson-metallic-rear-left",
    {
      linkId: "commons-2024-trax-crimson-metallic-rear-left",
      vehicleGroup: "2024-trax-crimson-metallic-activ-pa-2023-07-12",
      view: "rear left",
      finding:
        "Complete rear quarter of the same Trax ACTIV already represented by the archived front view is visible. The red finish is consistent across panels, with no visible wrap edge or repair mismatch.",
    },
  ],
  [
    "2024-colorado-nitro-yellow-front-right",
    {
      linkId: "commons-2024-colorado-nitro-yellow-metallic-front-right",
      vehicleGroup: "2024-colorado-nitro-yellow-zr2-pa-2024-07-18",
      view: "front right",
      finding:
        "Complete third generation Colorado ZR2 is visible, including the grille, lift, flares, tires, cab, and bed. The yellow finish is consistent across the visible panels.",
    },
  ],
  [
    "2024-colorado-nitro-yellow-rear-right",
    {
      linkId: "commons-2024-colorado-nitro-yellow-metallic-rear-right",
      vehicleGroup: "2024-colorado-nitro-yellow-zr2-pa-2024-07-18",
      view: "rear right",
      finding:
        "Complete rear quarter of the same Colorado ZR2 is visible, including the bed and tailgate. The yellow finish is consistent with the paired front view.",
    },
  ],
  [
    "2024-colorado-summit-white-front-left",
    {
      linkId: "commons-2024-colorado-summit-white-front-left",
      vehicleGroup: "2024-colorado-summit-white-z71-pa-2024-09-28",
      view: "front left",
      finding:
        "Complete third generation Colorado Z71 is visible, including the cab, bed, fascia, badge, and wheels. The white panels retain detail and show no visible wrap edge or repair mismatch.",
    },
  ],
  [
    "2025-traverse-mosaic-black-front-left",
    {
      linkId: "commons-2025-traverse-mosaic-black-metallic-front-left",
      vehicleGroup: "2025-traverse-mosaic-black-z71-pa-2025-09-06",
      view: "front left",
      finding:
        "Complete second generation Traverse Z71 is visible, including its fascia, badge, wheels, and tires. The black finish is consistent across panels; metallic character and original factory finish are not independently established by the image.",
    },
  ],
]);

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function resolveInsideRoot(value) {
  const result = path.resolve(ROOT, value);
  const relative = path.relative(ROOT, result);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Path leaves repository: ${value}`);
  }
  return result;
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(resolveInsideRoot(relativePath), "utf8"));
}

async function writeAtomic(relativePath, bytes) {
  const destination = resolveInsideRoot(relativePath);
  await mkdir(path.dirname(destination), { recursive: true });
  const temporary = `${destination}.tmp-${process.pid}`;
  await writeFile(temporary, bytes, { flag: "wx" });
  await rename(temporary, destination);
}

async function writeJson(relativePath, value) {
  await writeAtomic(relativePath, `${JSON.stringify(value, null, 2)}\n`);
}

function requireReleaseReceipt(asset, receipts) {
  const expected = [
    {
      kind: "original",
      name: asset.release_asset_name,
      bytes: asset.bytes,
      sha: asset.sha256,
    },
    {
      kind: "preview",
      name: asset.preview_release_asset_name,
      bytes: asset.preview_bytes,
      sha: asset.preview_sha256,
    },
  ];
  for (const item of expected) {
    const receipt = receipts.find(
      (row) => row.candidate_id === asset.candidate_id && row.kind === item.kind,
    );
    if (!receipt) {
      throw new Error(`Missing ${item.kind} receipt for ${asset.candidate_id}`);
    }
    if (
      receipt.asset_name !== item.name ||
      receipt.bytes !== item.bytes ||
      receipt.sha256 !== item.sha ||
      receipt.verification !== "github_reported_size_and_downloaded_sha256_match"
    ) {
      throw new Error(`Release receipt mismatch for ${asset.candidate_id} ${item.kind}`);
    }
  }
}

function colorIdFor(queueItem) {
  const key = `${queueItem.model_id}|${queueItem.model_year}|${queueItem.color_label}`;
  const colorId = COLOR_IDS.get(key);
  if (!colorId) throw new Error(`No exact archive color key for ${key}`);
  return colorId;
}

function canonicalAsset(staged, queueItem, review) {
  const colorId = colorIdFor(queueItem);
  const base = { ...staged };
  delete base.color_label;
  delete base.metadata_evidence;
  delete base.review_state;
  delete base.selection_contexts;
  return {
    ...base,
    status: "unreviewed_candidate",
    selection_kinds: ["reviewed_color_caption"],
    selection_contexts: [
      {
        kind: "reviewed_color_caption",
        model_id: queueItem.model_id,
        exact_year: queueItem.model_year,
        color_id: colorId,
        legacy_prior_status: "reviewed",
        legacy_note:
          `Commons identifies this exact ${queueItem.model_year} vehicle as finished in ` +
          `${queueItem.color_label}. The retained photograph was visually reviewed as a ` +
          "color example; factory-paint identity remains unverified.",
        evidence_source_urls: [
          staged.source_page_url,
          queueItem.palette_source_url,
        ],
        queue_candidate_key: queueItem.candidate_key,
        vehicle_group: review.vehicleGroup,
        view: review.view,
      },
    ],
    model_ids: [queueItem.model_id],
    commons_raw_record_paths: [FILES.durableRaw],
    visual_review_report: FILES.review,
    release_verification_report: FILES.durableReceipt,
  };
}

function colorLink(asset, queueItem, review) {
  return {
    link_id: review.linkId,
    photo_id: asset.candidate_id,
    model_id: queueItem.model_id,
    model_year: queueItem.model_year,
    archive_color_key: colorIdFor(queueItem),
    color_label: queueItem.color_label,
    visual_review_status: "reviewed",
    factory_paint_match_status: "unverified",
    commons_metadata_evidence: queueItem.metadata_evidence,
    commons_source_page_url: asset.source_page_url,
    archive_original_url: asset.release_asset_url,
    archive_preview_url: asset.preview_release_asset_url,
    commons_sha1: asset.commons_sha1,
    sha256: asset.sha256,
    width: asset.width,
    height: asset.height,
    license: asset.license,
    license_url: asset.license_url,
    attribution: asset.attribution,
    palette_source_id: queueItem.palette_source_id,
    palette_source_url: queueItem.palette_source_url,
    palette_locator: queueItem.palette_locator,
    note:
      "Commons identifies this vehicle as the stated Chevrolet model, model year, trim, and color. The photograph is retained as a qualified visual example. Original factory finish and paint code remain unverified.",
  };
}

async function main() {
  if (!process.argv.slice(2).includes("--apply")) {
    throw new Error("Pass --apply to merge the verified eight-photo batch");
  }
  const [
    staging,
    receipt,
    manifest,
    links,
    queue,
    audit,
    rawBytes,
    receiptBytes,
    stagingBytes,
  ] = await Promise.all([
    readJson(FILES.stagingManifest),
    readJson(FILES.stagingReceipt),
    readJson(FILES.manifest),
    readJson(FILES.links),
    readJson(FILES.queue),
    readJson(FILES.audit),
    readFile(resolveInsideRoot(FILES.stagingRaw)),
    readFile(resolveInsideRoot(FILES.stagingReceipt)),
    readFile(resolveInsideRoot(FILES.stagingManifest)),
  ]);

  if (
    staging.assets?.length !== EXPECTED_ASSETS ||
    queue.queued_candidates?.length !== EXPECTED_ASSETS ||
    receipt.asset_count !== EXPECTED_RELEASE_FILES ||
    receipt.github_account !== "ipadmom" ||
    receipt.repository !== "ipadmom/chevrolet-color-archive" ||
    receipt.release_tag !== "photo-archive-v1"
  ) {
    throw new Error("The staging batch or Release receipt is incomplete");
  }
  const raw = JSON.parse(rawBytes.toString("utf8"));
  if (raw.error || raw.query?.pages?.length !== EXPECTED_ASSETS) {
    throw new Error("The retained Commons API response is incomplete");
  }

  const queueByKey = new Map(
    queue.queued_candidates.map((item) => [item.candidate_key, item]),
  );
  const existingIds = new Set(manifest.assets.map((asset) => asset.candidate_id));
  const existingSha1 = new Set(manifest.assets.map((asset) => asset.commons_sha1));
  const newAssets = [];
  const newLinks = [];
  const reviewRows = [];
  for (const staged of staging.assets) {
    const context = staged.selection_contexts?.find(
      (item) => item.kind === "exact_year_color_example",
    );
    const queueItem = queueByKey.get(context?.queue_candidate_key);
    const review = REVIEW.get(context?.queue_candidate_key);
    if (!queueItem || !review) {
      throw new Error(`No queue or visual review for ${staged.candidate_id}`);
    }
    requireReleaseReceipt(staged, receipt.assets);
    if (existingIds.has(staged.candidate_id) || existingSha1.has(staged.commons_sha1)) {
      throw new Error(`Photo batch collides with canonical manifest: ${staged.candidate_id}`);
    }
    const asset = canonicalAsset(staged, queueItem, review);
    newAssets.push(asset);
    newLinks.push(colorLink(asset, queueItem, review));
    reviewRows.push({
      candidate_key: queueItem.candidate_key,
      candidate_id: asset.candidate_id,
      model_id: queueItem.model_id,
      model_year: queueItem.model_year,
      color_label: queueItem.color_label,
      archive_color_key: colorIdFor(queueItem),
      decision: "approved",
      view: review.view,
      vehicle_group: review.vehicleGroup,
      visual_finding: review.finding,
      commons_metadata_evidence: queueItem.metadata_evidence,
      source_page_url: asset.source_page_url,
      archive_original_url: asset.release_asset_url,
      archive_preview_url: asset.preview_release_asset_url,
      release_verification: "GitHub reported size and downloaded SHA-256 match",
      factory_paint_match_status: "unverified",
    });
  }

  const linkIds = new Set(links.links.map((link) => link.link_id));
  for (const link of newLinks) {
    if (linkIds.has(link.link_id)) throw new Error(`Duplicate color link ${link.link_id}`);
    linkIds.add(link.link_id);
  }
  manifest.assets.push(...newAssets);
  for (const asset of newAssets) {
    const model = manifest.models.find((item) => item.model_id === asset.model_ids[0]);
    if (!model) throw new Error(`Manifest model is absent: ${asset.model_ids[0]}`);
    model.asset_ids.push(asset.candidate_id);
  }
  links.links.push(...newLinks);

  manifest.generated_at = receipt.verified_at;
  manifest.github_release.published = true;
  manifest.run.unique_assets_selected = manifest.assets.length;
  manifest.run.staged_asset_count = manifest.assets.length;
  manifest.run.staged_total_bytes = manifest.assets.reduce(
    (sum, asset) => sum + asset.bytes,
    0,
  );
  const previewTotal = manifest.assets.reduce(
    (sum, asset) => sum + asset.preview_bytes,
    0,
  );
  manifest.run.preview_assets = {
    ...manifest.run.preview_assets,
    finished_at: receipt.verified_at,
    input_asset_count: manifest.assets.length,
    generated_asset_count:
      Number(manifest.run.preview_assets.generated_asset_count ?? 0) + EXPECTED_ASSETS,
    verified_original_count: manifest.assets.length,
    original_total_bytes: manifest.run.staged_total_bytes,
    preview_total_bytes: previewTotal,
    bytes_saved: manifest.run.staged_total_bytes - previewTotal,
    percent_reduction: Number(
      ((1 - previewTotal / manifest.run.staged_total_bytes) * 100).toFixed(2),
    ),
  };
  manifest.current_model_color_photo_batch = {
    visual_review_report: FILES.review,
    release_verification_report: FILES.durableReceipt,
    complete_commons_api_response: FILES.durableRaw,
    applied_at: receipt.verified_at,
    selected_asset_count: newAssets.length,
    release_asset_count: receipt.asset_count,
    release_upload_verified: true,
    vps_photo_payload_deleted: true,
  };

  links.generated_at = receipt.verified_at;
  const published = queue.queued_candidates.map((item) => {
    const contextAsset = newAssets.find((asset) =>
      asset.selection_contexts.some(
        (context) => context.queue_candidate_key === item.candidate_key,
      ),
    );
    return {
      ...item,
      candidate_id: contextAsset.candidate_id,
      archive_original_url: contextAsset.release_asset_url,
      archive_preview_url: contextAsset.preview_release_asset_url,
      commons_sha1: contextAsset.commons_sha1,
      sha256: contextAsset.sha256,
      visual_review_status: "reviewed",
      factory_paint_match_status: "unverified",
      release_verification_status: "verified",
      vps_payload_cleanup_status: "verified_deleted",
    };
  });
  queue.schema_version = 3;
  queue.generated_at = receipt.verified_at;
  queue.published_candidates = published;
  queue.queued_candidates = [];

  const currentIds = new Set(audit.manifest_coverage.current_model_ids);
  const currentAssets = manifest.assets.filter((asset) =>
    asset.model_ids.some((modelId) => currentIds.has(modelId)),
  );
  audit.schema_version = 2;
  audit.audited_at = receipt.verified_at;
  audit.manifest_coverage.archived_asset_counts = Object.fromEntries(
    audit.manifest_coverage.current_model_ids.map((modelId) => [
      modelId,
      manifest.assets.filter((asset) => asset.model_ids.includes(modelId)).length,
    ]),
  );
  audit.manifest_coverage.archived_asset_total = currentAssets.length;
  audit.manifest_coverage.published_current_model_photo_to_color_links =
    links.links.length;
  audit.manifest_coverage.published_current_model_photo_to_color_boundary =
    "Every reviewed color link is a qualified visual example only. Original factory finish and paint-code identity remain unverified.";
  audit.current_model_color_photo_batch = {
    review_report: FILES.review,
    release_verification_report: FILES.durableReceipt,
    complete_commons_api_response: FILES.durableRaw,
    published_asset_count: newAssets.length,
    published_color_link_count: newLinks.length,
    published_candidate_ids: newAssets.map((asset) => asset.candidate_id),
  };

  const durableRawSha = sha256(rawBytes);
  const durableReceiptSha = sha256(receiptBytes);
  const reviewReport = {
    schema_version: 1,
    reviewed_at: receipt.verified_at,
    visibility: "public",
    classification: "archive-internal",
    scope:
      "Visual review and publication record for eight exact-year Wikimedia Commons current Chevrolet color examples.",
    policy: {
      complete_vehicle_required: true,
      exact_caption_and_palette_label_required: true,
      adjacent_year_inference: false,
      factory_paint_boundary:
        "A Commons caption and photograph do not prove original factory finish or a paint code.",
      paired_views_count_as_one_vehicle: true,
    },
    source_records: {
      complete_commons_api_response: FILES.durableRaw,
      complete_commons_api_response_sha256: durableRawSha,
      staging_manifest_sha256: sha256(stagingBytes),
      release_verification_receipt: FILES.durableReceipt,
      release_verification_receipt_sha256: durableReceiptSha,
    },
    counts: {
      reviewed_photos: reviewRows.length,
      approved_photos: reviewRows.filter((row) => row.decision === "approved").length,
      distinct_photographed_vehicles: new Set(
        reviewRows.map((row) => row.vehicle_group),
      ).size,
      release_assets_verified: receipt.asset_count,
    },
    publication_boundary:
      "Commons identifies each vehicle as the stated Chevrolet model, model year, trim, and color. Each photograph is retained as a qualified visual example. Original factory finish and paint code remain unverified.",
    reviews: reviewRows,
  };

  await Promise.all([
    writeAtomic(FILES.durableRaw, rawBytes),
    writeAtomic(FILES.durableReceipt, receiptBytes),
    writeJson(FILES.review, reviewReport),
    writeJson(FILES.manifest, manifest),
    writeJson(FILES.links, links),
    writeJson(FILES.queue, queue),
    writeJson(FILES.audit, audit),
  ]);

  console.log(
    JSON.stringify({
      canonical_photo_assets: manifest.assets.length,
      current_model_photo_assets: currentAssets.length,
      current_model_color_links: links.links.length,
      batch_photos: newAssets.length,
      distinct_batch_vehicles: reviewReport.counts.distinct_photographed_vehicles,
      verified_release_assets: receipt.asset_count,
      complete_commons_api_response_sha256: durableRawSha,
    }),
  );
}

main().catch((error) => {
  console.error(error?.stack ?? error);
  process.exitCode = 1;
});

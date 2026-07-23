import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  bearerMatches,
  createOpaqueToken,
  detectImageMime,
  isPublicPhotoStatus,
  isReceiptToken,
  MAX_ARCHIVE_COLOR_ID_LENGTH,
  normalizeCredit,
  normalizeRights,
  parseBoundedInteger,
  parsePublishedAssetMappings,
  PUBLISHED_RELEASE_DOWNLOAD_BASE,
  PUBLISHED_RELEASE_TAG,
  publishedAttributionUrl,
  publishedAssetUrl,
  resolveArchiveContext,
  sanitizeFileName,
  sha256Hex,
} from "../app/api/archive-security.mjs";
import {
  ARCHIVE_RELEASE_DOWNLOAD_BASE,
  buildArchivedSelectionReceipt,
  parseArchivedCandidateIds,
  parseStoredArchivedSelectionReceipt,
} from "../app/api/archived-photo-selection.mjs";

const fixtureModels = [
  {
    id: "camaro",
    name: "Camaro",
    generations: [
      {
        years: ["1969"],
        colors: [
          {
            id: "hugger-orange",
            name: "Hugger Orange",
            availability: { "1969": { code: "72" } },
          },
        ],
      },
    ],
  },
];

test("archive context is derived from canonical published records", () => {
  assert.deepEqual(
    resolveArchiveContext(
      fixtureModels,
      "camaro",
      "1969",
      "hugger-orange",
    ),
    {
      model: "camaro",
      modelName: "Camaro",
      year: "1969",
      colorId: "hugger-orange",
      colorName: "Hugger Orange",
    },
  );
  assert.equal(
    resolveArchiveContext(fixtureModels, "camaro", "1968", "hugger-orange"),
    null,
  );
  assert.equal(
    resolveArchiveContext(fixtureModels, "../camaro", "1969", "hugger-orange"),
    null,
  );
});

test("archive context resolves exact program and specialty overlay colors", () => {
  const overlappingModel = {
    id: "tahoe",
    name: "Tahoe",
    generations: [
      {
        years: ["2000", "2003"],
        colors: [
          {
            id: "regular-black",
            name: "Black",
            availability: { "2000": { code: "41" } },
          },
        ],
      },
      {
        years: ["2000"],
        colors: [
          {
            id: "z71-victory-red",
            name: "Victory Red",
            availability: { "2000": { code: "Not printed" } },
          },
        ],
      },
      {
        years: ["2003"],
        colors: [
          {
            id: "specialty-woodland-green",
            name: "Woodland Green",
            availability: { "2003": { code: "9V5 / WA-9015" } },
          },
        ],
      },
    ],
  };

  assert.equal(
    resolveArchiveContext(
      [overlappingModel],
      "tahoe",
      "2000",
      "z71-victory-red",
    )?.colorName,
    "Victory Red",
  );
  assert.equal(
    resolveArchiveContext(
      [overlappingModel],
      "tahoe",
      "2003",
      "specialty-woodland-green",
    )?.colorName,
    "Woodland Green",
  );
});

test("archive context accepts canonical source-qualified color IDs within the explicit bound", () => {
  const colorId =
    "silverado-light-autumnwood-metallic-2012-gm-2012-silverado-1wt-tgk-seo-paint-228a-light-autumnwood-metallic";
  assert.equal(colorId.length, 107);
  assert.ok(colorId.length <= MAX_ARCHIVE_COLOR_ID_LENGTH);
  const model = {
    id: "silverado",
    name: "Silverado",
    generations: [
      {
        years: ["2012"],
        colors: [
          {
            id: colorId,
            name: "Light Autumnwood Metallic",
            availability: { "2012": { code: "WA-228A" } },
          },
        ],
      },
    ],
  };
  assert.equal(
    resolveArchiveContext([model], "silverado", "2012", colorId)?.colorId,
    colorId,
  );
  assert.equal(
    resolveArchiveContext(
      [model],
      "silverado",
      "2012",
      "x".repeat(MAX_ARCHIVE_COLOR_ID_LENGTH + 1),
    ),
    null,
  );
});

test("archived curatorial candidates resolve only through the pinned Release", async () => {
  const candidateId = "commons-sha1-c6820f56141d77a6d22b";
  assert.deepEqual(
    parseArchivedCandidateIds([candidateId, candidateId]),
    [candidateId],
  );
  assert.equal(parseArchivedCandidateIds([7]), null);
  assert.equal(parseArchivedCandidateIds(["../candidate"]), null);

  const context = {
    model: "camaro",
    year: "1969",
    colorId: "hugger-orange",
  };
  const receipt = buildArchivedSelectionReceipt(context, [candidateId]);
  assert.ok(receipt);
  assert.equal(receipt.candidates.length, 1);
  assert.equal(
    receipt.candidates[0].releaseAssetUrl.startsWith(
      ARCHIVE_RELEASE_DOWNLOAD_BASE,
    ),
    true,
  );
  assert.equal(
    JSON.stringify(receipt).includes("upload.wikimedia.org"),
    false,
  );
  assert.equal("sourceOriginalUrl" in receipt.candidates[0], false);
  assert.equal(
    buildArchivedSelectionReceipt(
      { ...context, year: "1968" },
      [candidateId],
    ),
    null,
  );

  const receiptJson = JSON.stringify(receipt);
  const receiptSha256 = await sha256Hex(receiptJson);
  assert.deepEqual(
    await parseStoredArchivedSelectionReceipt(
      receiptJson,
      receiptSha256,
      context,
      [candidateId],
    ),
    receipt,
  );
  assert.equal(
    await parseStoredArchivedSelectionReceipt(
      `${receiptJson} `,
      receiptSha256,
      context,
      [candidateId],
    ),
    null,
  );
});

test("credit and rights metadata are bounded and controlled", () => {
  assert.equal(normalizeCredit("  Amy   Collection  "), "Amy Collection");
  assert.equal(normalizeCredit("x".repeat(161)), null);
  assert.equal(normalizeCredit("line\nbreak"), null);
  assert.equal(normalizeRights("CC BY 4.0"), "CC BY 4.0");
  assert.equal(normalizeRights("Do whatever you want"), null);
  assert.equal(sanitizeFileName("../../bad name?.jpg"), "..-..-bad-name-.jpg");
});

test("image signatures must match supported file bytes", () => {
  assert.equal(
    detectImageMime(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0])),
    "image/jpeg",
  );
  assert.equal(
    detectImageMime(
      Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    ),
    "image/png",
  );
  assert.equal(
    detectImageMime(
      Uint8Array.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]),
    ),
    "image/gif",
  );
  assert.equal(
    detectImageMime(
      Uint8Array.from([
        0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50,
      ]),
    ),
    "image/webp",
  );
  assert.equal(detectImageMime(new TextEncoder().encode("<script>")), null);
});

test("receipt and queue bearer tokens are opaque and hash-verifiable", async () => {
  const receipt = createOpaqueToken();
  assert.equal(isReceiptToken(receipt), true);
  assert.equal(receipt.length, 43);
  assert.equal((await sha256Hex(receipt)).length, 64);

  const accepted = new Request("https://archive.test/api/selections", {
    headers: { authorization: "Bearer queue-secret" },
  });
  const rejected = new Request("https://archive.test/api/selections", {
    headers: { authorization: "Bearer wrong-secret" },
  });
  assert.equal(await bearerMatches(accepted, "queue-secret"), true);
  assert.equal(await bearerMatches(rejected, "queue-secret"), false);
  assert.equal(await bearerMatches(accepted, undefined), false);
});

test("public statuses and pagination bounds fail closed", () => {
  assert.equal(isPublicPhotoStatus("approved"), false);
  assert.equal(isPublicPhotoStatus("published"), true);
  assert.equal(isPublicPhotoStatus("staged"), false);
  assert.equal(parseBoundedInteger("250", 25, 1, 100), 100);
  assert.equal(parseBoundedInteger("-1", 25, 1, 100), 25);
  assert.equal(parseBoundedInteger(null, 25, 1, 100), 25);
});

test("public asset URLs are pinned to the versioned ipadmom GitHub Release", () => {
  const sha = "a".repeat(64);
  const name = `${sha}.jpg`;
  const url = `${PUBLISHED_RELEASE_DOWNLOAD_BASE}/${name}`;
  assert.equal(
    publishedAssetUrl(
      sha,
      PUBLISHED_RELEASE_TAG,
      name,
      url,
      "image/jpeg",
    ),
    url,
  );
  assert.equal(
    publishedAssetUrl(
      sha,
      PUBLISHED_RELEASE_TAG,
      `${sha}.png`,
      url,
      "image/jpeg",
    ),
    null,
  );
  assert.equal(
    publishedAssetUrl(
      sha.toUpperCase(),
      PUBLISHED_RELEASE_TAG,
      name,
      url,
      "image/jpeg",
    ),
    null,
  );
  assert.equal(
    publishedAssetUrl(
      sha,
      "community-photo-archive-v2",
      name,
      url,
      "image/jpeg",
    ),
    null,
  );
  const attributionName = `publication-3-7-${sha}.json`;
  const attributionUrl = `${PUBLISHED_RELEASE_DOWNLOAD_BASE}/${attributionName}`;
  assert.equal(
    publishedAttributionUrl(
      7,
      sha,
      PUBLISHED_RELEASE_TAG,
      attributionName,
      attributionUrl,
    ),
    attributionUrl,
  );
});

test("processed publication mappings are exact, bounded, and content addressed", () => {
  const sha = "b".repeat(64);
  const mapping = {
    candidateId: 7,
    publishedSha256: sha,
    publishedBytes: 1234,
    releaseTag: PUBLISHED_RELEASE_TAG,
    publishedAssetName: `${sha}.webp`,
    publishedAssetUrl: `${PUBLISHED_RELEASE_DOWNLOAD_BASE}/${sha}.webp`,
    attributionAssetName: `publication-3-7-${sha}.json`,
    attributionAssetUrl:
      `${PUBLISHED_RELEASE_DOWNLOAD_BASE}/publication-3-7-${sha}.json`,
    attributionSha256: "c".repeat(64),
    attributionBytes: 987,
  };
  assert.deepEqual(parsePublishedAssetMappings([mapping]), [mapping]);
  assert.equal(
    parsePublishedAssetMappings([{ ...mapping, candidateId: 0 }]),
    null,
  );
  assert.equal(
    parsePublishedAssetMappings([
      mapping,
      { ...mapping },
    ]),
    null,
  );
  assert.equal(
    parsePublishedAssetMappings([
      { ...mapping, releaseTag: "community-photo-archive-v2" },
    ]),
    null,
  );
  assert.equal(
    parsePublishedAssetMappings([{ ...mapping, extra: "not allowed" }]),
    null,
  );
});

test("route wiring preserves staged privacy and queue authentication", async () => {
  const root = new URL("../", import.meta.url);
  const [photos, photoObject, selections, explorer] = await Promise.all([
    readFile(new URL("app/api/photos/route.ts", root), "utf8"),
    readFile(new URL("app/api/photos/[id]/route.ts", root), "utf8"),
    readFile(new URL("app/api/selections/route.ts", root), "utf8"),
    readFile(new URL("app/archive-explorer.tsx", root), "utf8"),
  ]);

  assert.match(photos, /PUBLIC_PHOTO_STATUSES/);
  assert.match(photos, /issueReceipt/);
  assert.match(photoObject, /isPublicPhotoStatus/);
  assert.match(photoObject, /publishedAssetUrl/);
  assert.match(photoObject, /queueAuthorizationMatches/);
  assert.doesNotMatch(
    photoObject,
    /isPublic\s*\?\s*"public, max-age=3600"/,
  );
  assert.match(selections, /requireQueueAuthorization/);
  assert.match(selections, /leaseTokenHash/);
  assert.match(selections, /photoUploadReceipts\.receiptHash/);
  assert.match(selections, /buildArchivedSelectionReceipt/);
  assert.match(selections, /archivedSelectionReceiptSha256/);
  assert.match(explorer, /URL\.createObjectURL\(photo\)/);
  assert.match(explorer, /candidateIds,/);
  assert.match(explorer, /SAVE PHOTO CHOICES/);
  assert.doesNotMatch(explorer, /Published photo choice.*kept in this browser/);
  assert.doesNotMatch(explorer, /setApiPhotos\(\(current\) => \[payload/);
});

test("D1 table rebuild defers foreign keys instead of disabling them", async () => {
  const root = new URL("../", import.meta.url);
  const migration = await readFile(
    new URL("drizzle/0001_polite_purple_man.sql", root),
    "utf8",
  );

  assert.match(migration, /PRAGMA defer_foreign_keys=ON;/);
  assert.match(migration, /PRAGMA defer_foreign_keys=OFF;/);
  assert.doesNotMatch(migration, /PRAGMA foreign_keys\s*=/);
});

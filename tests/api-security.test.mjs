import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  bearerMatches,
  createOpaqueToken,
  detectImageMime,
  isPublicPhotoStatus,
  isReceiptToken,
  normalizeCredit,
  normalizeRights,
  parseBoundedInteger,
  parsePublishedAssetMappings,
  publishedAssetUrl,
  resolveArchiveContext,
  sanitizeFileName,
  sha256Hex,
} from "../app/api/archive-security.mjs";

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

test("public asset URLs are pinned to sanitized ipadmom GitHub paths", () => {
  const sha = "a".repeat(64);
  assert.equal(
    publishedAssetUrl(
      sha,
      `public/vehicle-photos/assets/${sha}.jpg`,
      "image/jpeg",
    ),
    `https://raw.githubusercontent.com/ipadmom/chevrolet-color-archive/main/public/vehicle-photos/assets/${sha}.jpg`,
  );
  assert.equal(
    publishedAssetUrl(
      sha,
      `public/vehicle-photos/assets/${sha}.png`,
      "image/jpeg",
    ),
    null,
  );
  assert.equal(
    publishedAssetUrl(
      sha.toUpperCase(),
      `public/vehicle-photos/assets/${sha}.jpg`,
      "image/jpeg",
    ),
    null,
  );
  assert.equal(
    publishedAssetUrl(
      sha,
      `public/vehicle-photos/assets/../${sha}.jpg`,
      "image/jpeg",
    ),
    null,
  );
});

test("processed publication mappings are exact, bounded, and content addressed", () => {
  const sha = "b".repeat(64);
  const mapping = {
    candidateId: 7,
    publishedSha256: sha,
    publishedAssetPath: `public/vehicle-photos/assets/${sha}.webp`,
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
      { ...mapping, publishedAssetPath: `public/vehicle-photos/${sha}.webp` },
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
  assert.match(explorer, /URL\.createObjectURL\(photo\)/);
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

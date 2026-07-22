import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { Miniflare } from "miniflare";

const root = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
const workerRoot = join(root, "dist", "server");
const requestHeaders = {
  "x-forwarded-for": "192.0.2.25",
};
const archivedCamaroCandidate = "commons-sha1-c6820f56141d77a6d22b";

async function applyMigrations(db) {
  const migrationRoot = join(root, "drizzle");
  const migrationFiles = (await readdir(migrationRoot))
    .filter((name) => /^\d{4}_.+\.sql$/.test(name))
    .sort();

  for (const name of migrationFiles) {
    const source = await readFile(join(migrationRoot, name), "utf8");
    for (const statement of source.split("--> statement-breakpoint")) {
      if (statement.trim()) {
        await db.prepare(statement.trim()).run();
      }
    }
  }
}

function multipartUpload(fields, bytes) {
  const boundary = "archive-route-integration-boundary";
  const chunks = [];

  for (const [name, value] of Object.entries(fields)) {
    chunks.push(
      Buffer.from(
        `--${boundary}\r\n` +
          `Content-Disposition: form-data; name="${name}"\r\n\r\n` +
          `${value}\r\n`,
      ),
    );
  }
  chunks.push(
    Buffer.from(
      `--${boundary}\r\n` +
        'Content-Disposition: form-data; name="photo"; filename="fixture.png"\r\n' +
        "Content-Type: image/png\r\n\r\n",
    ),
    bytes,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  );

  return {
    boundary,
    body: Buffer.concat(chunks),
  };
}

async function postJson(miniflare, pathname, payload) {
  const body = JSON.stringify(payload);
  return miniflare.dispatchFetch(`http://archive.test${pathname}`, {
    method: "POST",
    headers: {
      ...requestHeaders,
      "content-type": "application/json",
      "content-length": String(Buffer.byteLength(body)),
    },
    body,
  });
}

async function publisherPatch(miniflare, payload) {
  const body = JSON.stringify(payload);
  return miniflare.dispatchFetch("http://archive.test/api/selections", {
    method: "PATCH",
    headers: {
      authorization: "Bearer integration-publisher-token",
      "content-type": "application/json",
      "content-length": String(Buffer.byteLength(body)),
    },
    body,
  });
}

test(
  "real worker keeps staged uploads private and publishes only validated Release mappings",
  { timeout: 60_000 },
  async () => {
    const miniflare = new Miniflare({
      modules: true,
      scriptPath: join(workerRoot, "index.js"),
      modulesRoot: workerRoot,
      modulesRules: [
        { type: "ESModule", include: ["**/*.js", "**/*.mjs"] },
      ],
      compatibilityDate: "2026-05-15",
      compatibilityFlags: ["nodejs_compat"],
      d1Databases: { DB: "archive-route-integration" },
      r2Buckets: { UPLOADS: "archive-route-integration" },
      bindings: {
        PUBLISH_QUEUE_TOKEN: "integration-publisher-token",
        UPLOAD_RATE_SALT: "integration-rate-salt",
        PUBLIC_CORS_ORIGIN: "https://ipadmom.github.io",
      },
    });

    try {
      const db = await miniflare.getD1Database("DB");
      await applyMigrations(db);

      const png = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
        "base64",
      );
      const upload = multipartUpload(
        {
          model: "camaro",
          year: "1969",
          colorId: "hugger-orange",
          credit: "Integration Fixture",
          license: "CC BY 4.0",
        },
        png,
      );
      const uploadResponse = await miniflare.dispatchFetch(
        "http://archive.test/api/photos",
        {
          method: "POST",
          headers: {
            ...requestHeaders,
            "content-type": `multipart/form-data; boundary=${upload.boundary}`,
            "content-length": String(upload.body.byteLength),
          },
          body: upload.body,
        },
      );
      const uploaded = await uploadResponse.json();

      assert.equal(uploadResponse.status, 201);
      assert.match(uploaded.receipt, /^[A-Za-z0-9_-]{43}$/);
      assert.equal(uploaded.candidate.status, "staged");

      const selection = {
        model: "camaro",
        year: "1969",
        colorId: "hugger-orange",
        candidateIds: [archivedCamaroCandidate],
        receipts: [uploaded.receipt],
      };
      const firstResponse = await postJson(
        miniflare,
        "/api/selections",
        selection,
      );
      const first = await firstResponse.json();
      assert.equal(firstResponse.status, 201);
      assert.deepEqual(first, {
        recorded: true,
        queued: true,
        selectionId: 1,
        created: true,
        archivedCandidateCount: 1,
        uploadCandidateCount: 1,
      });

      const retryResponse = await postJson(
        miniflare,
        "/api/selections",
        selection,
      );
      const retry = await retryResponse.json();
      assert.equal(retryResponse.status, 200);
      assert.deepEqual(retry, {
        recorded: true,
        queued: true,
        selectionId: 1,
        created: false,
        archivedCandidateCount: 1,
        uploadCandidateCount: 1,
      });

      const reusedResponse = await postJson(
        miniflare,
        "/api/selections",
        {
          model: "camaro",
          year: "1968",
          colorId: "rally-green-family",
          receipts: [uploaded.receipt],
        },
      );
      assert.equal(reusedResponse.status, 409);

      const receipt = await db
        .prepare(
          "SELECT consumed_at AS consumedAt FROM photo_upload_receipts",
        )
        .first();
      assert.equal(typeof receipt.consumedAt, "string");
      assert.equal(
        (
          await db
            .prepare("SELECT COUNT(*) AS count FROM photo_review_selections")
            .first()
        ).count,
        1,
      );

      const publicResponse = await miniflare.dispatchFetch(
        "http://archive.test/api/photos?model=camaro&year=1969&color_id=hugger-orange",
      );
      assert.equal(publicResponse.status, 200);
      assert.deepEqual(await publicResponse.json(), {
        items: [],
        nextCursor: null,
      });

      for (const [year, colorId] of [
        ["2000", "tahoe-gmt800-lt-onyx-black-2000"],
        ["2000", "tahoe-gmt400-limited-onyx-black-2000"],
        ["2000", "tahoe-gmt400-z71-light-pewter-metallic-2000"],
        [
          "2003",
          "tahoe-woodland-green-2003-gm-2003-tahoe-woodland-green-wa9015-seo-9v5",
        ],
        [
          "2005",
          "tahoe-woodland-green-2005-nj-2005-tahoe-police-woodland-green-seo-9v5",
        ],
        [
          "2006",
          "tahoe-woodland-green-2006-nj-2006-tahoe-police-woodland-green-seo-9v5",
        ],
      ]) {
        const response = await miniflare.dispatchFetch(
          `http://archive.test/api/photos?model=tahoe&year=${year}&color_id=${colorId}`,
        );
        assert.equal(response.status, 200, `${year} ${colorId}`);
        assert.deepEqual(await response.json(), { items: [], nextCursor: null });
      }

      const publisherQueueResponse = await miniflare.dispatchFetch(
        "http://archive.test/api/selections",
      );
      assert.equal(publisherQueueResponse.status, 401);

      const claimResponse = await publisherPatch(miniflare, {
        action: "claim",
        leaseSeconds: 1800,
      });
      const claim = await claimResponse.json();
      assert.equal(claimResponse.status, 200);
      assert.equal(claim.selection.id, 1);
      assert.match(claim.leaseToken, /^[A-Za-z0-9_-]{43}$/);
      assert.deepEqual(claim.selection.archivedCandidateIds, [
        archivedCamaroCandidate,
      ]);
      assert.equal(claim.selection.archivedCandidates.length, 1);
      assert.match(
        claim.selection.archivedCandidates[0].releaseAssetUrl,
        /^https:\/\/github\.com\/ipadmom\/chevrolet-color-archive\/releases\/download\/photo-archive-v1\//,
      );
      assert.equal(
        JSON.stringify(claim.selection.archivedCandidates).includes(
          "upload.wikimedia.org",
        ),
        false,
      );

      const publishedSha256 = "a".repeat(64);
      const attributionSha256 = "b".repeat(64);
      const releaseBase =
        "https://github.com/ipadmom/chevrolet-color-archive/releases/download/community-photo-archive-v1";
      const publishedAssetName = `${publishedSha256}.png`;
      const attributionAssetName =
        `publication-1-1-${publishedSha256}.json`;
      const publishedAssets = [
        {
          candidateId: 1,
          publishedSha256,
          publishedBytes: 321,
          releaseTag: "community-photo-archive-v1",
          publishedAssetName,
          publishedAssetUrl: `${releaseBase}/${publishedAssetName}`,
          attributionAssetName,
          attributionAssetUrl: `${releaseBase}/${attributionAssetName}`,
          attributionSha256,
          attributionBytes: 654,
        },
      ];
      const acknowledgeResponse = await publisherPatch(miniflare, {
        action: "ack",
        selectionId: 1,
        leaseToken: claim.leaseToken,
        outcome: "processed",
        publishedAssets,
      });
      assert.equal(acknowledgeResponse.status, 200);
      assert.equal((await acknowledgeResponse.json()).status, "processed");

      const publicPublishedResponse = await miniflare.dispatchFetch(
        "http://archive.test/api/photos?model=camaro&year=1969&color_id=hugger-orange",
      );
      const publicPublished = await publicPublishedResponse.json();
      assert.equal(publicPublishedResponse.status, 200);
      assert.equal(publicPublished.items.length, 1);
      assert.equal(
        publicPublished.items[0].imageUrl,
        `${releaseBase}/${publishedAssetName}`,
      );
      assert.equal(
        publicPublished.items[0].attributionUrl,
        `${releaseBase}/${attributionAssetName}`,
      );
      assert.equal(publicPublished.items[0].publishedBytes, 321);
      assert.equal(publicPublished.items[0].attributionSha256, attributionSha256);

      const storedPublication = await db
        .prepare(
          `SELECT published_asset_path AS legacyPath,
                  published_asset_url AS assetUrl,
                  published_attribution_url AS attributionUrl
             FROM photo_candidates WHERE id = 1`,
        )
        .first();
      assert.equal(storedPublication.legacyPath, null);
      assert.equal(storedPublication.assetUrl, `${releaseBase}/${publishedAssetName}`);
      assert.equal(
        storedPublication.attributionUrl,
        `${releaseBase}/${attributionAssetName}`,
      );
    } finally {
      await miniflare.dispose();
    }
  },
);

test(
  "archive-only choices become immutable processed curatorial receipts",
  { timeout: 60_000 },
  async () => {
    const miniflare = new Miniflare({
      modules: true,
      scriptPath: join(workerRoot, "index.js"),
      modulesRoot: workerRoot,
      modulesRules: [
        { type: "ESModule", include: ["**/*.js", "**/*.mjs"] },
      ],
      compatibilityDate: "2026-05-15",
      compatibilityFlags: ["nodejs_compat"],
      d1Databases: { DB: "archive-curatorial-integration" },
      r2Buckets: { UPLOADS: "archive-curatorial-integration" },
      bindings: {
        PUBLISH_QUEUE_TOKEN: "integration-publisher-token",
        UPLOAD_RATE_SALT: "integration-rate-salt",
        PUBLIC_CORS_ORIGIN: "https://ipadmom.github.io",
      },
    });

    try {
      const db = await miniflare.getD1Database("DB");
      await applyMigrations(db);
      const selection = {
        model: "camaro",
        year: "1969",
        colorId: "hugger-orange",
        candidateIds: [archivedCamaroCandidate],
        receipts: [],
      };
      const response = await postJson(miniflare, "/api/selections", selection);
      assert.equal(response.status, 201);
      assert.deepEqual(await response.json(), {
        recorded: true,
        queued: false,
        selectionId: 1,
        created: true,
        archivedCandidateCount: 1,
        uploadCandidateCount: 0,
      });

      const retry = await postJson(miniflare, "/api/selections", selection);
      assert.equal(retry.status, 200);
      assert.deepEqual(await retry.json(), {
        recorded: true,
        queued: false,
        selectionId: 1,
        created: false,
        archivedCandidateCount: 1,
        uploadCandidateCount: 0,
      });

      const wrongContext = await postJson(miniflare, "/api/selections", {
        model: "camaro",
        year: "1968",
        colorId: "rally-green-family",
        candidateIds: [archivedCamaroCandidate],
      });
      assert.equal(wrongContext.status, 409);
      const unknownCandidate = await postJson(miniflare, "/api/selections", {
        ...selection,
        candidateIds: ["commons-sha1-00000000000000000000"],
      });
      assert.equal(unknownCandidate.status, 409);

      const stored = await db
        .prepare(`
          SELECT candidate_ids_json AS uploadedIds,
                 archived_candidate_ids_json AS archivedIds,
                 archived_selection_receipt_json AS receipt,
                 archived_selection_receipt_sha256 AS receiptSha256,
                 status,
                 processed_at AS processedAt
          FROM photo_review_selections
        `)
        .first();
      assert.equal(stored.uploadedIds, "[]");
      assert.equal(
        stored.archivedIds,
        JSON.stringify([archivedCamaroCandidate]),
      );
      assert.equal(stored.status, "processed");
      assert.equal(typeof stored.processedAt, "string");
      assert.equal(
        createHash("sha256").update(stored.receipt).digest("hex"),
        stored.receiptSha256,
      );
      const receipt = JSON.parse(stored.receipt);
      assert.equal(receipt.release.owner, "ipadmom");
      assert.equal(receipt.release.tag, "photo-archive-v1");
      assert.equal(receipt.candidates[0].candidateId, archivedCamaroCandidate);
      assert.match(
        receipt.candidates[0].releaseAssetUrl,
        /^https:\/\/github\.com\/ipadmom\/chevrolet-color-archive\/releases\/download\/photo-archive-v1\//,
      );
      assert.equal(stored.receipt.includes("upload.wikimedia.org"), false);

      const claim = await publisherPatch(miniflare, {
        action: "claim",
        leaseSeconds: 1800,
      });
      assert.equal(claim.status, 200);
      assert.deepEqual(await claim.json(), {
        leaseToken: null,
        selection: null,
      });
    } finally {
      await miniflare.dispose();
    }
  },
);

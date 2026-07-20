import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
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

test(
  "real worker keeps anonymous uploads private and consumes queue receipts once",
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
        queued: true,
        selectionId: 1,
        created: true,
      });

      const retryResponse = await postJson(
        miniflare,
        "/api/selections",
        selection,
      );
      const retry = await retryResponse.json();
      assert.equal(retryResponse.status, 200);
      assert.deepEqual(retry, {
        queued: true,
        selectionId: 1,
        created: false,
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

      const publisherQueueResponse = await miniflare.dispatchFetch(
        "http://archive.test/api/selections",
      );
      assert.equal(publisherQueueResponse.status, 401);
    } finally {
      await miniflare.dispose();
    }
  },
);

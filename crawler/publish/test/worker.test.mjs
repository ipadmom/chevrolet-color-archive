import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { hostname, tmpdir } from "node:os";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  EXPECTED_GITHUB_BRANCH,
  EXPECTED_GITHUB_OWNER,
  EXPECTED_GITHUB_REMOTE,
  assertPushInputs,
  githubOwnerFromRemote,
  sanitizeGitEnvironment,
  withPublisherLock,
} from "../git.mjs";
import {
  acknowledgeSelection,
  createReviewTemplate,
  fetchQueuedReviewRecords,
  normalizeSitesBaseUrl,
  publishClaimedQueue,
  publishReviewedSelections,
  recordsFromApprovalDocument,
  writeNewJson,
} from "../worker.mjs";
import {
  MAX_IMAGE_DIMENSION,
  sanitizeImageForPublication,
} from "../image-sanitizer.mjs";

const QUEUE_TOKEN = "fixture-queue-token";
const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const temporaryRoot = path.resolve(testDirectory, ".tmp");
const fixtureDirectory = new URL("../fixtures/", import.meta.url);
const selectionFixtures = JSON.parse(
  await readFile(new URL("selections.json", fixtureDirectory), "utf8"),
);
const candidateFixtures = JSON.parse(
  await readFile(new URL("candidates.json", fixtureDirectory), "utf8"),
);
const encodedImages = JSON.parse(
  await readFile(new URL("images.json", fixtureDirectory), "utf8"),
);
const imageBytes = new Map(
  Object.entries(encodedImages).map(([id, encoded]) => [
    Number(id),
    Buffer.from(encoded, "base64"),
  ]),
);

async function createTemporaryRepo() {
  await mkdir(temporaryRoot, { recursive: true });
  return mkdtemp(`${temporaryRoot}${path.sep}case-`);
}

async function removeTemporaryRepo(directory) {
  const resolved = path.resolve(directory);
  assert.ok(resolved.startsWith(`${temporaryRoot}${path.sep}`));
  await rm(resolved, { recursive: true, force: true });
}

async function startFixtureServer({
  paginate = false,
  terminalStatus = null,
  activeLease = false,
  mutateClaimedSelection = null,
  overrideImageBytes = new Map(),
  omitImageContentLength = false,
} = {}) {
  const events = [];
  const acknowledgments = [];
  let baseUrl;
  let claimed = false;

  function hydratedSelection(status = "queued") {
    return {
      ...structuredClone(selectionFixtures[0]),
      status,
      attemptCount: status === "leased" ? 1 : 0,
      leaseExpiresAt:
        status === "leased" ? "2026-07-20T20:30:00.000Z" : null,
      candidates: candidateFixtures.map((candidate) => ({
        ...structuredClone(candidate),
        downloadUrl: candidate.downloadUrl.replace("__BASE__", baseUrl),
      })),
    };
  }

  const server = createServer(async (request, response) => {
    const url = new URL(request.url, "http://127.0.0.1");
    if (request.headers.authorization !== `Bearer ${QUEUE_TOKEN}`) {
      events.push("unauthorized");
      response.statusCode = 401;
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/selections") {
      const status = url.searchParams.get("status") ?? "queued";
      const cursor = url.searchParams.get("cursor") ?? "first";
      events.push(
        status === "queued"
          ? `queue-get:${cursor}`
          : `queue-get:${status}:${cursor}`,
      );
      response.setHeader("content-type", "application/json");
      if (status !== "queued") {
        let items = [];
        if (status === terminalStatus) items = [hydratedSelection(status)];
        if (status === "leased" && activeLease) {
          items = [
            {
              ...hydratedSelection("leased"),
              leaseExpiresAt: "2999-01-01T00:00:00.000Z",
            },
          ];
        }
        response.end(JSON.stringify({ items, nextCursor: null }));
        return;
      }
      if (paginate && !url.searchParams.has("cursor")) {
        response.end(
          JSON.stringify({ items: [hydratedSelection()], nextCursor: 6 }),
        );
      } else {
        response.end(
          JSON.stringify({
            items: paginate ? [] : [hydratedSelection()],
            nextCursor: null,
          }),
        );
      }
      return;
    }

    if (request.method === "PATCH" && url.pathname === "/api/selections") {
      const chunks = [];
      for await (const chunk of request) chunks.push(chunk);
      const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      if (body.action === "claim") {
        events.push("claim");
        response.setHeader("content-type", "application/json");
        if (claimed) {
          response.end(JSON.stringify({ leaseToken: null, selection: null }));
        } else {
          claimed = true;
          const claimedSelection = hydratedSelection("leased");
          if (typeof mutateClaimedSelection === "function") {
            mutateClaimedSelection(claimedSelection);
          }
          response.end(
            JSON.stringify({
              leaseToken:
                "lease_fixture_0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef",
              selection: claimedSelection,
            }),
          );
        }
        return;
      }
      if (body.action === "ack") {
        events.push(`ack:${body.outcome}`);
        acknowledgments.push(body);
        const status =
          body.outcome === "processed"
            ? "processed"
            : body.outcome === "failed"
              ? "failed"
              : "queued";
        response.setHeader("content-type", "application/json");
        response.end(JSON.stringify({ ok: true, status }));
        return;
      }
    }

    const imageMatch = url.pathname.match(/^\/api\/photos\/(\d+)$/);
    if (request.method === "GET" && imageMatch) {
      const id = Number(imageMatch[1]);
      events.push(`download:${id}`);
      const candidate = candidateFixtures.find((item) => item.id === id);
      const bytes = overrideImageBytes.get(id) ?? imageBytes.get(id);
      if (!candidate || !bytes) {
        response.statusCode = 404;
        response.end();
        return;
      }
      response.setHeader("content-type", candidate.contentType);
      if (!omitImageContentLength) {
        response.setHeader("content-length", String(bytes.length));
      }
      response.end(bytes);
      return;
    }

    response.statusCode = 404;
    response.end();
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
  return {
    baseUrl,
    events,
    acknowledgments,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

function completeReviews(template, { approveSecond = false } = {}) {
  const document = structuredClone(template);
  document.items[0].review = {
    ...document.items[0].review,
    decision: "approve",
    reviewedBy: "Fixture Reviewer",
    reviewedAt: "2026-07-20T19:00:00.000Z",
    rightsBasis: "Source page and CC BY terms reviewed against the attribution.",
    notes: "Fixture approval",
  };
  document.items[1].review = approveSecond
    ? {
        ...document.items[1].review,
        decision: "approve",
        reviewedBy: "Fixture Reviewer",
        reviewedAt: "2026-07-20T20:00:00.000Z",
        rightsBasis: "The permission record and uploader authority were reviewed.",
        notes: "Fixture approval",
      }
    : {
        ...document.items[1].review,
        decision: "reject",
        reason: "The submitted permission cannot be independently verified.",
        notes: "Fixture rejection",
      };
  return document;
}

async function getSnapshot(fixtureServer) {
  return fetchQueuedReviewRecords({
    sitesBaseUrl: fixtureServer.baseUrl,
    queueToken: QUEUE_TOKEN,
  });
}

test("uses bearer auth, follows bounded queue pages, and preserves hydrated metadata", async () => {
  const fixtureServer = await startFixtureServer({ paginate: true });
  try {
    const snapshot = await getSnapshot(fixtureServer);
    assert.equal(snapshot.records.length, 1);
    assert.equal(snapshot.completeQueueSnapshot, true);
    assert.deepEqual(snapshot.records[0].selection, selectionFixtures[0]);
    assert.equal(snapshot.records[0].candidates.length, 2);
    assert.equal(
      snapshot.records[0].candidates[0].downloadUrl,
      `${fixtureServer.baseUrl}/api/photos/101`,
    );
    assert.deepEqual(fixtureServer.events, [
      "queue-get:first",
      "queue-get:6",
    ]);

    const template = createReviewTemplate({
      baseUrl: snapshot.baseUrl,
      records: snapshot.records,
      completeQueueSnapshot: snapshot.completeQueueSnapshot,
      generatedAt: "2026-07-20T18:00:00.000Z",
    });
    assert.equal(template.schemaVersion, 3);
    assert.equal(template.completeQueueSnapshot, true);
    assert.equal(template.items[0].review.decision, "");
    assert.equal(
      template.items[0].review.approvedSha256,
      candidateFixtures[0].sha256,
    );
    assert.equal(template.items[0].review.reviewedOriginalUrl, null);
    assert.equal("lastErrorCode" in template.items[0].selection, false);
    assert.deepEqual(template.items[0].candidate, snapshot.records[0].candidates[0]);
  } finally {
    await fixtureServer.close();
  }
});

test("rejects queue access without the bearer token", async () => {
  const fixtureServer = await startFixtureServer();
  try {
    await assert.rejects(
      fetchQueuedReviewRecords({
        sitesBaseUrl: fixtureServer.baseUrl,
        queueToken: "",
      }),
      /PUBLISH_QUEUE_TOKEN/,
    );
    assert.deepEqual(fixtureServer.events, []);
  } finally {
    await fixtureServer.close();
  }
});

test("sends only enumerated queue error codes and rejects free-form errors", async () => {
  const fixtureServer = await startFixtureServer();
  const leaseToken = "lease_fixture_sensitive_value";
  try {
    await acknowledgeSelection({
      sitesBaseUrl: fixtureServer.baseUrl,
      queueToken: QUEUE_TOKEN,
      selectionId: 7,
      leaseToken,
      outcome: "retry",
      errorCode: "publisher_retry",
    });
    assert.equal(
      fixtureServer.acknowledgments[0].errorCode,
      "publisher_retry",
    );
    assert.equal("error" in fixtureServer.acknowledgments[0], false);
    await assert.rejects(
      acknowledgeSelection({
        sitesBaseUrl: fixtureServer.baseUrl,
        queueToken: QUEUE_TOKEN,
        selectionId: 7,
        leaseToken,
        outcome: "retry",
        errorCode: `Failure contained ${QUEUE_TOKEN} and ${leaseToken}.`,
      }),
      /server-approved error code/,
    );
  } finally {
    await fixtureServer.close();
  }
});

test("publishes approved bytes locally and deduplicates a rerun by SHA-256", async () => {
  const fixtureServer = await startFixtureServer();
  const repoRoot = await createTemporaryRepo();
  try {
    const snapshot = await getSnapshot(fixtureServer);
    snapshot.records[0].candidates[1].originalUrl =
      "https://example.test/photos/alternate?id=102&sig=temporary#private";
    const approvals = completeReviews(
      createReviewTemplate({
        baseUrl: snapshot.baseUrl,
        records: snapshot.records,
        completeQueueSnapshot: true,
        generatedAt: "2026-07-20T18:00:00.000Z",
      }),
      { approveSecond: true },
    );
    const first = await publishReviewedSelections({
      sitesBaseUrl: snapshot.baseUrl,
      queueToken: QUEUE_TOKEN,
      records: snapshot.records,
      approvalDocument: approvals,
      repoRoot,
    });
    const firstSanitized = await sanitizeImageForPublication(
      imageBytes.get(101),
      "image/png",
    );
    const secondSanitized = await sanitizeImageForPublication(
      imageBytes.get(102),
      "image/gif",
    );
    const expectedSha = firstSanitized.publishedSha256;
    const expectedAssetPath = `public/vehicle-photos/assets/${expectedSha}.png`;
    assert.equal(first.writtenAssets, 2);
    assert.deepEqual(
      first.publicationPaths,
      [
        expectedAssetPath,
        `public/vehicle-photos/assets/${secondSanitized.publishedSha256}.gif`,
        "public/vehicle-photos/attribution.json",
      ].sort(),
    );

    const second = await publishReviewedSelections({
      sitesBaseUrl: snapshot.baseUrl,
      queueToken: QUEUE_TOKEN,
      records: snapshot.records,
      approvalDocument: approvals,
      repoRoot,
    });
    assert.equal(second.writtenAssets, 0);
    assert.equal(second.deduplicatedAssets, 2);
    assert.equal(second.manifestChanged, false);

    const manifest = JSON.parse(
      await readFile(
        path.join(repoRoot, "public", "vehicle-photos", "attribution.json"),
        "utf8",
      ),
    );
    const publicCandidate = structuredClone(approvals.items[0].candidate);
    delete publicCandidate.downloadUrl;
    assert.deepEqual(manifest.publications[0].candidate, publicCandidate);
    assert.equal(
      manifest.publications[1].candidate.originalUrl,
      "https://example.test/photos/alternate",
    );
    assert.equal(
      manifest.publications[1].rightsReview.reviewedOriginalUrl,
      "https://example.test/photos/alternate",
    );
    assert.equal("downloadUrl" in manifest.publications[1].candidate, false);
    const reviewedSelection = structuredClone(selectionFixtures[0]);
    delete reviewedSelection.lastErrorCode;
    assert.deepEqual(manifest.publications[0].selection, reviewedSelection);
    assert.equal(
      manifest.publications[0].transform.sourceSha256,
      approvals.items[0].candidate.sha256,
    );
    assert.equal(manifest.assets[0].width, 1);
    assert.equal(manifest.assets[0].height, 1);
  } finally {
    await fixtureServer.close();
    await removeTemporaryRepo(repoRoot);
  }
});

test("fails closed before download when rights review is incomplete", async () => {
  const fixtureServer = await startFixtureServer();
  const repoRoot = await createTemporaryRepo();
  try {
    const snapshot = await getSnapshot(fixtureServer);
    const incomplete = createReviewTemplate({
      baseUrl: snapshot.baseUrl,
      records: snapshot.records,
      completeQueueSnapshot: true,
      generatedAt: "2026-07-20T18:00:00.000Z",
    });
    incomplete.items[0].review = {
      ...incomplete.items[0].review,
      decision: "approve",
      reviewedBy: "Fixture Reviewer",
      reviewedAt: "2026-07-20T19:00:00.000Z",
      rightsBasis: "Reviewed",
    };
    await assert.rejects(
      publishReviewedSelections({
        sitesBaseUrl: snapshot.baseUrl,
        queueToken: QUEUE_TOKEN,
        records: snapshot.records,
        approvalDocument: incomplete,
        repoRoot,
      }),
      /explicitly say approve or reject/,
    );
    assert.equal(
      fixtureServer.events.some((event) => event.startsWith("download:")),
      false,
    );
  } finally {
    await fixtureServer.close();
    await removeTemporaryRepo(repoRoot);
  }
});

test("rejects credential material before it can enter a review manifest", async () => {
  const fixtureServer = await startFixtureServer();
  const repoRoot = await createTemporaryRepo();
  try {
    const snapshot = await getSnapshot(fixtureServer);
    const approvals = completeReviews(
      createReviewTemplate({
        baseUrl: snapshot.baseUrl,
        records: snapshot.records,
        completeQueueSnapshot: true,
        generatedAt: "2026-07-20T18:00:00.000Z",
      }),
      { approveSecond: true },
    );
    approvals.items[0].review.notes = QUEUE_TOKEN;
    await assert.rejects(
      publishReviewedSelections({
        sitesBaseUrl: snapshot.baseUrl,
        queueToken: QUEUE_TOKEN,
        records: snapshot.records,
        approvalDocument: approvals,
        repoRoot,
      }),
      /Credential material is forbidden/,
    );
    assert.equal(
      fixtureServer.events.some((event) => event.startsWith("download:")),
      false,
    );
  } finally {
    await fixtureServer.close();
    await removeTemporaryRepo(repoRoot);
  }
});

test("refuses metadata drift and never replaces another file at a hash path", async () => {
  const fixtureServer = await startFixtureServer();
  const repoRoot = await createTemporaryRepo();
  try {
    const snapshot = await getSnapshot(fixtureServer);
    const template = createReviewTemplate({
      baseUrl: snapshot.baseUrl,
      records: snapshot.records,
      completeQueueSnapshot: true,
      generatedAt: "2026-07-20T18:00:00.000Z",
    });
    const drifted = completeReviews(template);
    drifted.items[0].candidate.credit = "Changed after review";
    await assert.rejects(
      publishReviewedSelections({
        sitesBaseUrl: snapshot.baseUrl,
        queueToken: QUEUE_TOKEN,
        records: snapshot.records,
        approvalDocument: drifted,
        repoRoot,
      }),
      /no longer matches current Sites metadata/,
    );

    const approvals = completeReviews(template, { approveSecond: true });
    const expectedSha = (
      await sanitizeImageForPublication(imageBytes.get(101), "image/png")
    ).publishedSha256;
    const assetDirectory = path.join(
      repoRoot,
      "public",
      "vehicle-photos",
      "assets",
    );
    await mkdir(assetDirectory, { recursive: true });
    await writeFile(path.join(assetDirectory, `${expectedSha}.png`), "different bytes");
    await assert.rejects(
      publishReviewedSelections({
        sitesBaseUrl: snapshot.baseUrl,
        queueToken: QUEUE_TOKEN,
        records: snapshot.records,
        approvalDocument: approvals,
        repoRoot,
      }),
      /Refusing to replace a different file/,
    );
  } finally {
    await fixtureServer.close();
    await removeTemporaryRepo(repoRoot);
  }
});

test("claims, authenticates downloads, pushes, then acknowledges processed", async () => {
  const fixtureServer = await startFixtureServer();
  const repoRoot = await createTemporaryRepo();
  try {
    const snapshot = await getSnapshot(fixtureServer);
    const approvals = completeReviews(
      createReviewTemplate({
        baseUrl: snapshot.baseUrl,
        records: snapshot.records,
        completeQueueSnapshot: true,
        generatedAt: "2026-07-20T18:00:00.000Z",
      }),
      { approveSecond: true },
    );
    const reviewedRecords = recordsFromApprovalDocument({
      approvalDocument: approvals,
      sitesBaseUrl: snapshot.baseUrl,
      requireCompleteQueue: true,
    });
    const result = await publishClaimedQueue({
      sitesBaseUrl: snapshot.baseUrl,
      queueToken: QUEUE_TOKEN,
      queueSnapshotRecords: reviewedRecords,
      approvalDocument: approvals,
      repoRoot,
      fetchImpl: fetch,
      pushPublication: async (publication) => {
        fixtureServer.events.push("push");
        assert.equal(publication.publicationPaths.length, 3);
        return { committed: true, pushed: true };
      },
    });
    assert.equal(result.processedSelections, 1);
    assert.equal(result.failedRightsSelections, 0);
    assert.deepEqual(fixtureServer.events.slice(-5), [
      "claim",
      "download:101",
      "download:102",
      "push",
      "ack:processed",
    ]);
    assert.equal(fixtureServer.acknowledgments[0].selectionId, 7);
    assert.equal(fixtureServer.acknowledgments[0].outcome, "processed");
    assert.deepEqual(
      fixtureServer.acknowledgments[0].publishedAssets,
      result.results[0].publication.publishedAssets,
    );
    assert.deepEqual(
      fixtureServer.acknowledgments[0].publishedAssets.map(
        (asset) => asset.candidateId,
      ),
      [101, 102],
    );
  } finally {
    await fixtureServer.close();
    await removeTemporaryRepo(repoRoot);
  }
});

test("fails an atomic selection when any candidate is rejected", async () => {
  const fixtureServer = await startFixtureServer();
  const repoRoot = await createTemporaryRepo();
  try {
    const snapshot = await getSnapshot(fixtureServer);
    const approvals = completeReviews(
      createReviewTemplate({
        baseUrl: snapshot.baseUrl,
        records: snapshot.records,
        completeQueueSnapshot: true,
        generatedAt: "2026-07-20T18:00:00.000Z",
      }),
    );
    let pushCalled = false;
    const result = await publishClaimedQueue({
      sitesBaseUrl: snapshot.baseUrl,
      queueToken: QUEUE_TOKEN,
      queueSnapshotRecords: recordsFromApprovalDocument({
        approvalDocument: approvals,
        sitesBaseUrl: snapshot.baseUrl,
        requireCompleteQueue: true,
      }),
      approvalDocument: approvals,
      repoRoot,
      pushPublication: async () => {
        pushCalled = true;
        return { pushed: true };
      },
    });
    assert.equal(result.failedRightsSelections, 1);
    assert.equal(pushCalled, false);
    assert.deepEqual(fixtureServer.events.slice(-2), ["claim", "ack:failed"]);
    assert.equal(
      fixtureServer.acknowledgments.at(-1).errorCode,
      "rights_review_rejected",
    );
    assert.deepEqual(
      fixtureServer.acknowledgments.at(-1).rejectedCandidateIds,
      [102],
    );
    assert.equal(
      fixtureServer.events.some((event) => event.startsWith("download:")),
      false,
    );
  } finally {
    await fixtureServer.close();
    await removeTemporaryRepo(repoRoot);
  }
});

test("acknowledges retry when GitHub publication is not confirmed", async () => {
  const fixtureServer = await startFixtureServer();
  const repoRoot = await createTemporaryRepo();
  try {
    const snapshot = await getSnapshot(fixtureServer);
    const approvals = completeReviews(
      createReviewTemplate({
        baseUrl: snapshot.baseUrl,
        records: snapshot.records,
        completeQueueSnapshot: true,
        generatedAt: "2026-07-20T18:00:00.000Z",
      }),
      { approveSecond: true },
    );
    await assert.rejects(
      publishClaimedQueue({
        sitesBaseUrl: snapshot.baseUrl,
        queueToken: QUEUE_TOKEN,
        queueSnapshotRecords: recordsFromApprovalDocument({
          approvalDocument: approvals,
          sitesBaseUrl: snapshot.baseUrl,
          requireCompleteQueue: true,
        }),
        approvalDocument: approvals,
        repoRoot,
        pushPublication: async () => ({ committed: true, pushed: false }),
      }),
      /GitHub push was not confirmed/,
    );
    assert.equal(fixtureServer.events.at(-1), "ack:retry");
    assert.equal(fixtureServer.acknowledgments.at(-1).outcome, "retry");
    assert.equal(
      fixtureServer.acknowledgments.at(-1).errorCode,
      "publication_pre_push_failed",
    );
  } finally {
    await fixtureServer.close();
    await removeTemporaryRepo(repoRoot);
  }
});

test("acknowledges retry when claimed hydration is invalid", async () => {
  const fixtureServer = await startFixtureServer({
    mutateClaimedSelection(selection) {
      delete selection.candidates[0].sha256;
    },
  });
  const repoRoot = await createTemporaryRepo();
  try {
    const snapshot = await getSnapshot(fixtureServer);
    const approvals = completeReviews(
      createReviewTemplate({
        baseUrl: snapshot.baseUrl,
        records: snapshot.records,
        completeQueueSnapshot: true,
        generatedAt: "2026-07-20T18:00:00.000Z",
      }),
      { approveSecond: true },
    );
    await assert.rejects(
      publishClaimedQueue({
        sitesBaseUrl: snapshot.baseUrl,
        queueToken: QUEUE_TOKEN,
        queueSnapshotRecords: recordsFromApprovalDocument({
          approvalDocument: approvals,
          sitesBaseUrl: snapshot.baseUrl,
          requireCompleteQueue: true,
        }),
        approvalDocument: approvals,
        repoRoot,
        pushPublication: async () => ({ pushed: true }),
      }),
      /invalid stored SHA-256/,
    );
    assert.equal(fixtureServer.events.at(-1), "ack:retry");
    assert.equal(
      fixtureServer.acknowledgments.at(-1).errorCode,
      "claim_hydration_failed",
    );
  } finally {
    await fixtureServer.close();
    await removeTemporaryRepo(repoRoot);
  }
});

test("acknowledges retry when claimed approval metadata drifted", async () => {
  const fixtureServer = await startFixtureServer({
    mutateClaimedSelection(selection) {
      selection.candidates[0].originalUrl =
        "https://example.test/changed-after-review";
    },
  });
  const repoRoot = await createTemporaryRepo();
  try {
    const snapshot = await getSnapshot(fixtureServer);
    const approvals = completeReviews(
      createReviewTemplate({
        baseUrl: snapshot.baseUrl,
        records: snapshot.records,
        completeQueueSnapshot: true,
        generatedAt: "2026-07-20T18:00:00.000Z",
      }),
      { approveSecond: true },
    );
    await assert.rejects(
      publishClaimedQueue({
        sitesBaseUrl: snapshot.baseUrl,
        queueToken: QUEUE_TOKEN,
        queueSnapshotRecords: recordsFromApprovalDocument({
          approvalDocument: approvals,
          sitesBaseUrl: snapshot.baseUrl,
          requireCompleteQueue: true,
        }),
        approvalDocument: approvals,
        repoRoot,
        pushPublication: async () => ({ pushed: true }),
      }),
      /no longer matches current Sites metadata/,
    );
    assert.equal(fixtureServer.events.at(-1), "ack:retry");
    assert.equal(
      fixtureServer.acknowledgments.at(-1).errorCode,
      "approval_metadata_invalid",
    );
  } finally {
    await fixtureServer.close();
    await removeTemporaryRepo(repoRoot);
  }
});

test("rejects changed bytes by stored SHA-256 and acknowledges retry", async () => {
  const changedBytes = Buffer.from(imageBytes.get(101));
  changedBytes[changedBytes.length - 13] ^= 0x01;
  const fixtureServer = await startFixtureServer({
    overrideImageBytes: new Map([[101, changedBytes]]),
  });
  const repoRoot = await createTemporaryRepo();
  try {
    const snapshot = await getSnapshot(fixtureServer);
    const approvals = completeReviews(
      createReviewTemplate({
        baseUrl: snapshot.baseUrl,
        records: snapshot.records,
        completeQueueSnapshot: true,
        generatedAt: "2026-07-20T18:00:00.000Z",
      }),
      { approveSecond: true },
    );
    await assert.rejects(
      publishClaimedQueue({
        sitesBaseUrl: snapshot.baseUrl,
        queueToken: QUEUE_TOKEN,
        queueSnapshotRecords: recordsFromApprovalDocument({
          approvalDocument: approvals,
          sitesBaseUrl: snapshot.baseUrl,
          requireCompleteQueue: true,
        }),
        approvalDocument: approvals,
        repoRoot,
        pushPublication: async () => ({ pushed: true }),
      }),
      /SHA-256 changed after rights review/,
    );
    assert.equal(fixtureServer.events.at(-1), "ack:retry");
    assert.equal(
      fixtureServer.acknowledgments.at(-1).errorCode,
      "publication_pre_push_failed",
    );
  } finally {
    await fixtureServer.close();
    await removeTemporaryRepo(repoRoot);
  }
});

test("stops a chunked candidate download at the publication byte limit", async () => {
  const fixtureServer = await startFixtureServer({
    omitImageContentLength: true,
  });
  const repoRoot = await createTemporaryRepo();
  try {
    const snapshot = await getSnapshot(fixtureServer);
    const approvals = completeReviews(
      createReviewTemplate({
        baseUrl: snapshot.baseUrl,
        records: snapshot.records,
        completeQueueSnapshot: true,
        generatedAt: "2026-07-20T18:00:00.000Z",
      }),
      { approveSecond: true },
    );
    await assert.rejects(
      publishReviewedSelections({
        sitesBaseUrl: snapshot.baseUrl,
        queueToken: QUEUE_TOKEN,
        records: snapshot.records,
        approvalDocument: approvals,
        repoRoot,
        maxAssetBytes: 16,
      }),
      /publication size limit/,
    );
  } finally {
    await fixtureServer.close();
    await removeTemporaryRepo(repoRoot);
  }
});

test("strips private image metadata and rejects decompression-bomb dimensions", async () => {
  const source = imageBytes.get(101);
  const metadata = Buffer.from("fixture author", "utf8");
  const textChunk = Buffer.alloc(12 + metadata.length);
  textChunk.writeUInt32BE(metadata.length, 0);
  textChunk.write("tEXt", 4, 4, "ascii");
  metadata.copy(textChunk, 8);
  const withMetadata = Buffer.concat([
    source.subarray(0, source.length - 12),
    textChunk,
    source.subarray(source.length - 12),
  ]);
  const sanitized = await sanitizeImageForPublication(
    withMetadata,
    "image/png",
  );
  assert.equal(sanitized.bytes.includes(metadata), false);
  assert.ok(sanitized.transform.removedMetadata.includes("png:tEXt"));
  assert.ok(
    sanitized.transform.removedMetadata.includes(
      "reencode:all-container-metadata",
    ),
  );
  assert.notEqual(sanitized.sourceSha256, sanitized.publishedSha256);

  const privateChunkData = Buffer.from("private extension payload", "utf8");
  const privateChunk = Buffer.alloc(12 + privateChunkData.length);
  privateChunk.writeUInt32BE(privateChunkData.length, 0);
  privateChunk.write("vpAg", 4, 4, "ascii");
  privateChunkData.copy(privateChunk, 8);
  const withPrivateChunk = Buffer.concat([
    source.subarray(0, source.length - 12),
    privateChunk,
    source.subarray(source.length - 12),
  ]);
  const privateChunkSanitized = await sanitizeImageForPublication(
    withPrivateChunk,
    "image/png",
  );
  assert.equal(privateChunkSanitized.bytes.includes(privateChunkData), false);
  assert.ok(
    privateChunkSanitized.transform.removedMetadata.includes("png:vpAg"),
  );

  const bomb = Buffer.from(source);
  bomb.writeUInt32BE(MAX_IMAGE_DIMENSION + 1, 16);
  await assert.rejects(
    sanitizeImageForPublication(bomb, "image/png"),
    /publication limit/,
  );

  const gifBomb = Buffer.from(imageBytes.get(102));
  const imageDescriptor = gifBomb.indexOf(0x2c);
  assert.ok(imageDescriptor > 0);
  gifBomb.writeUInt16LE(0xffff, imageDescriptor + 5);
  gifBomb.writeUInt16LE(0xffff, imageDescriptor + 7);
  await assert.rejects(
    sanitizeImageForPublication(gifBomb, "image/gif"),
    /publication limit|logical screen/,
  );

  const webpChunk = (type, data) => {
    const header = Buffer.alloc(8);
    header.write(type, 0, 4, "ascii");
    header.writeUInt32LE(data.length, 4);
    return Buffer.concat([
      header,
      data,
      ...(data.length % 2 ? [Buffer.from([0])] : []),
    ]);
  };
  const vp8x = Buffer.alloc(10);
  const vp8 = Buffer.alloc(10);
  vp8.set([0x9d, 0x01, 0x2a], 3);
  vp8.writeUInt16LE(0x3fff, 6);
  vp8.writeUInt16LE(0x3fff, 8);
  const secretProfile = Buffer.from("private ICC profile", "utf8");
  const webpBody = Buffer.concat([
    Buffer.from("WEBP", "ascii"),
    webpChunk("VP8X", vp8x),
    webpChunk("ICCP", secretProfile),
    webpChunk("VP8 ", vp8),
  ]);
  const webp = Buffer.alloc(8);
  webp.write("RIFF", 0, 4, "ascii");
  webp.writeUInt32LE(webpBody.length, 4);
  const inconsistentWebp = Buffer.concat([webp, webpBody]);
  await assert.rejects(
    sanitizeImageForPublication(inconsistentWebp, "image/webp"),
    /do not match|publication limit/,
  );

  const privateWebp = Buffer.from(
    "UklGRhIBAABXRUJQVlA4WAoAAAAIAAAAAAAAAAAAVlA4TA8AAAAvAAAAAAcQ/Y/+ByKi/wEARVhJRtwAAABFeGlmAABJSSoACAAAAAcAEgEDAAEAAAABAAAAGgEFAAEAAABiAAAAGwEFAAEAAABqAAAAKAEDAAEAAAACAAAAOwECABUAAAByAAAAEwIDAAEAAAABAAAAaYcEAAEAAACIAAAAAAAAADhjAADoAwAAOGMAAOgDAABwcml2YXRlIFdlYlAgcGF5bG9hZAAABgAAkAcABAAAADAyMTABkQcABAAAAAECAwAAoAcABAAAADAxMDABoAMAAQAAAP//AAACoAQAAQAAAAEAAAADoAQAAQAAAAEAAAAAAAAA",
    "base64",
  );
  const privateWebpData = Buffer.from("private WebP payload", "utf8");
  const sanitizedWebp = await sanitizeImageForPublication(
    privateWebp,
    "image/webp",
  );
  assert.equal(sanitizedWebp.bytes.includes(privateWebpData), false);
  assert.ok(
    sanitizedWebp.transform.removedMetadata.includes("webp:EXIF"),
  );
});

test("skips a reviewed selection already terminal in the authenticated queue", async () => {
  const fixtureServer = await startFixtureServer({
    terminalStatus: "processed",
  });
  const repoRoot = await createTemporaryRepo();
  try {
    const queuedFixture = await getSnapshot(fixtureServer);
    const approvals = completeReviews(
      createReviewTemplate({
        baseUrl: queuedFixture.baseUrl,
        records: queuedFixture.records,
        completeQueueSnapshot: true,
        generatedAt: "2026-07-20T18:00:00.000Z",
      }),
      { approveSecond: true },
    );
    fixtureServer.events.length = 0;
    const result = await publishClaimedQueue({
      sitesBaseUrl: fixtureServer.baseUrl,
      queueToken: QUEUE_TOKEN,
      queueSnapshotRecords: recordsFromApprovalDocument({
        approvalDocument: approvals,
        sitesBaseUrl: fixtureServer.baseUrl,
        requireCompleteQueue: true,
      }),
      approvalDocument: approvals,
      repoRoot,
      pushPublication: async () => {
        throw new Error("Push must not run for a terminal selection.");
      },
    });
    assert.equal(result.skippedTerminalSelections, 1);
    assert.equal(fixtureServer.events.includes("claim"), false);
  } finally {
    await fixtureServer.close();
    await removeTemporaryRepo(repoRoot);
  }
});

test("stops before claiming when the reviewed selection has an active lease", async () => {
  const fixtureServer = await startFixtureServer({ activeLease: true });
  const repoRoot = await createTemporaryRepo();
  try {
    const snapshot = await getSnapshot(fixtureServer);
    const approvals = completeReviews(
      createReviewTemplate({
        baseUrl: snapshot.baseUrl,
        records: snapshot.records,
        completeQueueSnapshot: true,
        generatedAt: "2026-07-20T18:00:00.000Z",
      }),
      { approveSecond: true },
    );
    fixtureServer.events.length = 0;
    await assert.rejects(
      publishClaimedQueue({
        sitesBaseUrl: fixtureServer.baseUrl,
        queueToken: QUEUE_TOKEN,
        queueSnapshotRecords: recordsFromApprovalDocument({
          approvalDocument: approvals,
          sitesBaseUrl: fixtureServer.baseUrl,
          requireCompleteQueue: true,
        }),
        approvalDocument: approvals,
        repoRoot,
        pushPublication: async () => ({ pushed: true }),
      }),
      /active publisher lease/,
    );
    assert.equal(fixtureServer.events.includes("claim"), false);
  } finally {
    await fixtureServer.close();
    await removeTemporaryRepo(repoRoot);
  }
});

test("review templates never overwrite an existing file", async () => {
  const repoRoot = await createTemporaryRepo();
  try {
    const output = path.join(repoRoot, "review.json");
    await writeNewJson(output, { first: true });
    await assert.rejects(writeNewJson(output, { second: true }), {
      code: "EEXIST",
    });
    assert.deepEqual(JSON.parse(await readFile(output, "utf8")), { first: true });
  } finally {
    await removeTemporaryRepo(repoRoot);
  }
});

test("push guards require exact ipadmom repository, HTTPS, and main", () => {
  assert.equal(
    githubOwnerFromRemote(EXPECTED_GITHUB_REMOTE),
    EXPECTED_GITHUB_OWNER,
  );
  assert.equal(
    githubOwnerFromRemote("git@github.com:ipadmom/chevrolet-color-archive.git"),
    null,
  );
  assert.equal(
    githubOwnerFromRemote("https://secret@github.com/ipadmom/repo.git"),
    null,
  );
  assert.throws(
    () =>
      assertPushInputs({
        ghToken: "fixture-token",
        login: "aimesy",
        remoteUrl: EXPECTED_GITHUB_REMOTE,
      }),
    /ipadmom/,
  );
  assert.throws(
    () =>
      assertPushInputs({
        ghToken: "fixture-token",
        login: EXPECTED_GITHUB_OWNER,
        remoteUrl: "https://github.com/ipadmom/another-repo.git",
      }),
    /exactly/,
  );
  assert.throws(
    () =>
      assertPushInputs({
        ghToken: "fixture-token",
        login: EXPECTED_GITHUB_OWNER,
        branch: "master",
        remoteUrl: EXPECTED_GITHUB_REMOTE,
      }),
    /main/,
  );
  assert.doesNotThrow(() =>
    assertPushInputs({
      ghToken: "fixture-token",
      login: EXPECTED_GITHUB_OWNER,
      branch: EXPECTED_GITHUB_BRANCH,
      remoteUrls: [EXPECTED_GITHUB_REMOTE],
      pushUrls: [EXPECTED_GITHUB_REMOTE],
    }),
  );
});

test("git child environments never inherit publication credentials", () => {
  const sanitized = sanitizeGitEnvironment({
    PATH: "fixture-path",
    GH_TOKEN: "github-secret",
    GITHUB_TOKEN: "github-secret-two",
    PUBLISH_QUEUE_TOKEN: "queue-secret",
    GIT_CONFIG_COUNT: "1",
    GIT_CONFIG_KEY_0: "credential.helper",
    GIT_CONFIG_VALUE_0: "unsafe",
    git_config_parameters: "'credential.helper'='unsafe'",
    Git_Exec_Path: "unsafe-bin",
    GH_HOST: "attacker.example",
    HTTPS_PROXY: "https://attacker.example",
    GIT_PROXY_COMMAND: "unsafe-proxy",
    GIT_REPLACE_REF_BASE: "unsafe-replacements",
    GIT_SSL_NO_VERIFY: "1",
    SSL_CERT_FILE: "attacker.pem",
  });
  assert.deepEqual(sanitized, {
    PATH: "fixture-path",
    GIT_TERMINAL_PROMPT: "0",
  });
});

test("publisher lock rejects concurrent manifest and claim workflows", async () => {
  const repoRoot = await createTemporaryRepo();
  let releaseFirst;
  let markFirstStarted;
  const firstCanFinish = new Promise((resolve) => {
    releaseFirst = resolve;
  });
  const firstStarted = new Promise((resolve) => {
    markFirstStarted = resolve;
  });
  try {
    const first = withPublisherLock({
      repoRoot,
      task: async () => {
        markFirstStarted();
        await firstCanFinish;
        return "complete";
      },
    });
    await firstStarted;
    await assert.rejects(
      withPublisherLock({
        repoRoot,
        task: async () => "unexpected",
      }),
      /already holds/,
    );
    releaseFirst();
    assert.equal(await first, "complete");
  } finally {
    if (releaseFirst) releaseFirst();
    await removeTemporaryRepo(repoRoot);
  }
});

test("publisher lock recovers a dead same-host owner", async () => {
  const repoRoot = await createTemporaryRepo();
  const rootKey =
    process.platform === "win32"
      ? path.resolve(repoRoot).toLowerCase()
      : path.resolve(repoRoot);
  const lockId = createHash("sha256").update(rootKey).digest("hex");
  const lockPath = path.resolve(
    tmpdir(),
    `chevrolet-photo-publisher-${lockId}.lock`,
  );
  assert.equal(path.dirname(lockPath), path.resolve(tmpdir()));
  try {
    await mkdir(lockPath);
    await writeFile(
      path.join(lockPath, "owner.json"),
      JSON.stringify({
        pid: 2_147_483_647,
        hostname: hostname(),
        repoRootKey: rootKey,
        startedAt: "2026-07-20T00:00:00.000Z",
      }),
    );
    const result = await withPublisherLock({
      repoRoot,
      task: async () => "recovered",
    });
    assert.equal(result, "recovered");
    await assert.rejects(readFile(path.join(lockPath, "owner.json")), {
      code: "ENOENT",
    });
  } finally {
    await rm(lockPath, { recursive: true, force: true });
    await removeTemporaryRepo(repoRoot);
  }
});

test("Sites URL policy requires HTTPS except for loopback fixtures", () => {
  assert.equal(
    normalizeSitesBaseUrl("https://archive.example/"),
    "https://archive.example",
  );
  assert.equal(
    normalizeSitesBaseUrl("http://127.0.0.1:8787/"),
    "http://127.0.0.1:8787",
  );
  assert.throws(() => normalizeSitesBaseUrl("http://archive.example"), /HTTPS/);
  assert.throws(
    () => normalizeSitesBaseUrl("https://user:secret@archive.example"),
    /credentials/,
  );
});

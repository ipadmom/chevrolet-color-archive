#!/usr/bin/env node

import path from "node:path";

import {
  commitAndPushPublication,
  verifyGitHubPublicationTarget,
  withPublisherLock,
} from "./git.mjs";
import {
  DEFAULT_ASSET_ROOT,
  createReviewTemplate,
  fetchQueuedReviewRecords,
  publishClaimedQueue,
  publishReviewedSelections,
  readJsonFile,
  recordsFromApprovalDocument,
  normalizeRelativeRepoPath,
  writeNewJson,
} from "./worker.mjs";

const HELP = `Reviewed Chevrolet photo publication worker

Usage:
  SITES_BASE_URL=https://example node crawler/publish/cli.mjs \\
    --prepare-review work/photo-rights-review.json [--selection-id 7]

  SITES_BASE_URL=https://example node crawler/publish/cli.mjs \\
    --approvals work/photo-rights-review.json [--repo-root PATH] [--push]

Options:
  --prepare-review PATH  Fetch queued metadata and create a new review template.
  --approvals PATH       Publish only candidates explicitly approved in this file.
  --repo-root PATH       Git worktree root. Defaults to the current directory.
  --asset-root PATH      Relative output root for local checks. Push uses public/vehicle-photos.
  --selection-id ID      Limit work to one queued selection. Repeatable.
  --push                 Verify ipadmom, exact HTTPS repo/main, commit outputs, and push.
  --help                 Show this help.

Environment:
  SITES_BASE_URL          Required. HTTPS Sites deployment base URL.
  PUBLISH_QUEUE_TOKEN     Required. Sent only as a bearer credential to Sites.
  GH_TOKEN                Required only with --push. Never written or printed.`;

function parseArgs(argv) {
  const options = {
    selectionIds: [],
    repoRoot: process.cwd(),
    assetRoot: "public/vehicle-photos",
    push: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--help") options.help = true;
    else if (argument === "--push") options.push = true;
    else if (
      [
        "--prepare-review",
        "--approvals",
        "--repo-root",
        "--asset-root",
        "--selection-id",
      ].includes(argument)
    ) {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`${argument} requires a value.`);
      }
      index += 1;
      if (argument === "--prepare-review") options.prepareReview = value;
      else if (argument === "--approvals") options.approvals = value;
      else if (argument === "--repo-root") options.repoRoot = value;
      else if (argument === "--asset-root") options.assetRoot = value;
      else options.selectionIds.push(Number(value));
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(`${HELP}\n`);
    return;
  }
  if (Boolean(options.prepareReview) === Boolean(options.approvals)) {
    throw new Error("Choose exactly one of --prepare-review or --approvals.");
  }
  if (options.push && options.prepareReview) {
    throw new Error("--push can only be used with --approvals.");
  }
  if (options.push && options.selectionIds.length) {
    throw new Error("--selection-id cannot be combined with --push.");
  }
  if (
    options.push &&
    normalizeRelativeRepoPath(options.assetRoot, "Asset root") !==
      DEFAULT_ASSET_ROOT
  ) {
    throw new Error(`--push requires the canonical ${DEFAULT_ASSET_ROOT} asset root.`);
  }
  if (!process.env.PUBLISH_QUEUE_TOKEN) {
    throw new Error("PUBLISH_QUEUE_TOKEN is required.");
  }

  if (options.push) {
    const result = await withPublisherLock({
      repoRoot: options.repoRoot,
      task: async () => {
        const approvalDocument = await readJsonFile(options.approvals);
        const reviewedRecords = recordsFromApprovalDocument({
          approvalDocument,
          sitesBaseUrl: process.env.SITES_BASE_URL,
          requireCompleteQueue: true,
        });
        verifyGitHubPublicationTarget({
          repoRoot: options.repoRoot,
          environment: process.env,
          allowCleanAheadPaths: [
            normalizeRelativeRepoPath(options.assetRoot, "Asset root"),
          ],
        });
        return publishClaimedQueue({
          sitesBaseUrl: process.env.SITES_BASE_URL,
          queueToken: process.env.PUBLISH_QUEUE_TOKEN,
          queueSnapshotRecords: reviewedRecords,
          approvalDocument,
          repoRoot: options.repoRoot,
          assetRoot: options.assetRoot,
          pushPublication: (publication) =>
            commitAndPushPublication({
              repoRoot: options.repoRoot,
              publicationPaths: publication.publicationPaths,
              environment: process.env,
            }),
        });
      },
    });
    process.stdout.write(
      `${JSON.stringify({ mode: "claim-publish", ...result })}\n`,
    );
    return;
  }

  const queueSnapshot = await fetchQueuedReviewRecords({
    sitesBaseUrl: process.env.SITES_BASE_URL,
    queueToken: process.env.PUBLISH_QUEUE_TOKEN,
    selectionIds: options.selectionIds,
  });
  const { baseUrl, records } = queueSnapshot;
  if (options.prepareReview) {
    const template = createReviewTemplate({
      baseUrl,
      records,
      completeQueueSnapshot: queueSnapshot.completeQueueSnapshot,
    });
    await writeNewJson(options.prepareReview, template);
    process.stdout.write(
      `${JSON.stringify({
        mode: "prepare-review",
        queuedSelections: records.length,
        reviewItems: template.items.length,
        output: path.resolve(options.prepareReview),
      })}\n`,
    );
    return;
  }

  const approvalDocument = await readJsonFile(options.approvals);
  const result = await withPublisherLock({
    repoRoot: options.repoRoot,
    task: () =>
      publishReviewedSelections({
        sitesBaseUrl: baseUrl,
        queueToken: process.env.PUBLISH_QUEUE_TOKEN,
        records,
        approvalDocument,
        repoRoot: options.repoRoot,
        assetRoot: options.assetRoot,
      }),
  });
  process.stdout.write(
    `${JSON.stringify({
      mode: "local-publication-check",
      ...result,
      git: { committed: false, pushed: false, reason: "push-not-requested" },
    })}\n`,
  );
}

main().catch((error) => {
  let message = error instanceof Error ? error.message : String(error);
  for (const token of [
    process.env.GH_TOKEN,
    process.env.PUBLISH_QUEUE_TOKEN,
  ]) {
    if (token) message = message.replaceAll(token, "[redacted]");
  }
  process.stderr.write(`${JSON.stringify({ error: message })}\n`);
  process.exitCode = 1;
});

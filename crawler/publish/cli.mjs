#!/usr/bin/env node

import path from "node:path";

import { withPublisherLock } from "./git.mjs";
import { createGitHubReleasePublisher } from "./release.mjs";
import {
  createReviewTemplate,
  fetchQueuedReviewRecords,
  publishClaimedQueue,
  publishReviewedSelections,
  readJsonFile,
  recordsFromApprovalDocument,
  writeNewJson,
} from "./worker.mjs";

const HELP = `Reviewed Chevrolet photo publication worker

Usage:
  SITES_BASE_URL=https://example node crawler/publish/cli.mjs \\
    --prepare-review work/photo-rights-review.json [--selection-id 7]

  SITES_BASE_URL=https://example node crawler/publish/cli.mjs \\
    --approvals work/photo-rights-review.json [--repo-root PATH] [--publish-release]

Options:
  --prepare-review PATH  Fetch queued metadata and create a new review template.
  --approvals PATH       Publish only candidates explicitly approved in this file.
  --repo-root PATH       Lock namespace. Defaults to the current directory.
  --selection-id ID      Limit work to one queued selection. Repeatable.
  --publish-release      Verify ipadmom and upload deterministic assets to the v1 Release.
  --push                 Compatibility alias for --publish-release; no Git commit is made.
  --help                 Show this help.

Environment:
  SITES_BASE_URL          Required. HTTPS Sites deployment base URL.
  PUBLISH_QUEUE_TOKEN     Required. Sent only as a bearer credential to Sites.
  GH_TOKEN                Required only for Release publication. Never written or printed.`;

function parseArgs(argv) {
  const options = {
    selectionIds: [],
    repoRoot: process.cwd(),
    publishRelease: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--help") options.help = true;
    else if (["--push", "--publish-release"].includes(argument)) {
      options.publishRelease = true;
    }
    else if (
      [
        "--prepare-review",
        "--approvals",
        "--repo-root",
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
  if (options.publishRelease && options.prepareReview) {
    throw new Error("--publish-release can only be used with --approvals.");
  }
  if (options.publishRelease && options.selectionIds.length) {
    throw new Error("--selection-id cannot be combined with --publish-release.");
  }
  if (!process.env.PUBLISH_QUEUE_TOKEN) {
    throw new Error("PUBLISH_QUEUE_TOKEN is required.");
  }

  if (options.publishRelease) {
    const result = await withPublisherLock({
      repoRoot: options.repoRoot,
      task: async () => {
        const approvalDocument = await readJsonFile(options.approvals);
        const reviewedRecords = recordsFromApprovalDocument({
          approvalDocument,
          sitesBaseUrl: process.env.SITES_BASE_URL,
          requireCompleteQueue: true,
        });
        const releasePublisher = createGitHubReleasePublisher({
          environment: process.env,
        });
        await releasePublisher.verifyTarget();
        return publishClaimedQueue({
          sitesBaseUrl: process.env.SITES_BASE_URL,
          queueToken: process.env.PUBLISH_QUEUE_TOKEN,
          queueSnapshotRecords: reviewedRecords,
          approvalDocument,
          publishRelease: (publication) => releasePublisher.publish(publication),
        });
      },
    });
    process.stdout.write(
      `${JSON.stringify({ mode: "claim-release-publish", ...result })}\n`,
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
      }),
  });
  const summary = { ...result };
  delete summary.releaseUploadAssets;
  process.stdout.write(
    `${JSON.stringify({
      mode: "local-release-check",
      ...summary,
      githubRelease: {
        published: false,
        reason: "release-publication-not-requested",
      },
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

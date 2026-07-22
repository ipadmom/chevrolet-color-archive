import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import {
  COMMUNITY_PHOTO_DOWNLOAD_BASE,
  COMMUNITY_PHOTO_RELEASE_TAG,
  EXPECTED_GITHUB_OWNER,
  EXPECTED_GITHUB_REPOSITORY,
  createGitHubReleasePublisher,
} from "../release.mjs";

const TOKEN = "fixture-github-token";

function json(payload, init = {}) {
  return new Response(JSON.stringify(payload), {
    ...init,
    headers: { "content-type": "application/json", ...init.headers },
  });
}

function fixturePublication(bytes = Buffer.from("sanitized photo")) {
  const digest = createHash("sha256").update(bytes).digest("hex");
  const name = `${digest}.jpg`;
  return {
    release: {
      owner: EXPECTED_GITHUB_OWNER,
      repository: EXPECTED_GITHUB_REPOSITORY,
      tag: COMMUNITY_PHOTO_RELEASE_TAG,
    },
    releaseUploadAssets: [
      {
        kind: "image",
        name,
        url: `${COMMUNITY_PHOTO_DOWNLOAD_BASE}/${name}`,
        mediaType: "image/jpeg",
        sha256: digest,
        sizeBytes: bytes.length,
        bytes,
      },
    ],
  };
}

function createGitHubMock({ login = EXPECTED_GITHUB_OWNER } = {}) {
  const assets = [];
  const requests = [];
  const release = {
    id: 17,
    tag_name: COMMUNITY_PHOTO_RELEASE_TAG,
    draft: false,
    prerelease: false,
  };
  return {
    assets,
    requests,
    async fetch(url, options = {}) {
      const parsed = new URL(url);
      requests.push({
        url,
        method: options.method ?? "GET",
        authorization: options.headers?.authorization,
      });
      assert.equal(parsed.searchParams.has("access_token"), false);
      if (parsed.hostname === "api.github.com" && parsed.pathname === "/user") {
        return json({ login });
      }
      if (
        parsed.hostname === "api.github.com" &&
        parsed.pathname.endsWith(`/releases/tags/${COMMUNITY_PHOTO_RELEASE_TAG}`)
      ) {
        return json(release);
      }
      if (
        parsed.hostname === "api.github.com" &&
        parsed.pathname.endsWith(`/releases/${release.id}/assets`)
      ) {
        return json(assets);
      }
      if (
        parsed.hostname === "uploads.github.com" &&
        parsed.pathname.endsWith(`/releases/${release.id}/assets`) &&
        options.method === "POST"
      ) {
        const name = parsed.searchParams.get("name");
        const bytes = Buffer.from(options.body);
        const asset = {
          id: assets.length + 1,
          name,
          state: "uploaded",
          size: bytes.length,
          digest: `sha256:${createHash("sha256").update(bytes).digest("hex")}`,
          browser_download_url: `${COMMUNITY_PHOTO_DOWNLOAD_BASE}/${name}`,
        };
        assets.push(asset);
        return json(asset, { status: 201 });
      }
      throw new Error(`Unexpected mock GitHub request: ${url}`);
    },
  };
}

test("uploads deterministic Release assets and reuses verified assets on retry", async () => {
  const github = createGitHubMock();
  const publisher = createGitHubReleasePublisher({
    environment: { GH_TOKEN: TOKEN },
    fetchImpl: github.fetch,
  });
  await publisher.verifyTarget();
  const publication = fixturePublication();
  const first = await publisher.publish(publication);
  assert.equal(first.published, true);
  assert.deepEqual(first.uploadedAssets, [publication.releaseUploadAssets[0].name]);
  assert.deepEqual(first.reusedAssets, []);

  const second = await publisher.publish(publication);
  assert.equal(second.published, true);
  assert.deepEqual(second.uploadedAssets, []);
  assert.deepEqual(second.reusedAssets, [publication.releaseUploadAssets[0].name]);
  assert.equal(github.assets.length, 1);
  assert.ok(
    github.requests
      .filter((request) => request.url.startsWith("https://api.github.com/") || request.url.startsWith("https://uploads.github.com/"))
      .every((request) => request.authorization === `Bearer ${TOKEN}`),
  );
});

test("fails closed for the wrong GitHub account and conflicting Release bytes", async () => {
  const wrongAccount = createGitHubMock({ login: "aimesy" });
  await assert.rejects(
    createGitHubReleasePublisher({
      environment: { GH_TOKEN: TOKEN },
      fetchImpl: wrongAccount.fetch,
    }).verifyTarget(),
    /authenticate as ipadmom/,
  );

  const github = createGitHubMock();
  const publication = fixturePublication();
  github.assets.push({
    id: 1,
    name: publication.releaseUploadAssets[0].name,
    state: "uploaded",
    size: publication.releaseUploadAssets[0].sizeBytes,
    digest: `sha256:${"0".repeat(64)}`,
    browser_download_url: publication.releaseUploadAssets[0].url,
  });
  const publisher = createGitHubReleasePublisher({
    environment: { GH_TOKEN: TOKEN },
    fetchImpl: github.fetch,
  });
  await publisher.verifyTarget();
  await assert.rejects(publisher.publish(publication), /digest conflict/);
});

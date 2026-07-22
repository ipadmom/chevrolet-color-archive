import { createHash } from "node:crypto";

export const EXPECTED_GITHUB_OWNER = "ipadmom";
export const EXPECTED_GITHUB_REPOSITORY = "chevrolet-color-archive";
export const COMMUNITY_PHOTO_RELEASE_TAG = "community-photo-archive-v1";
export const COMMUNITY_PHOTO_RELEASE_NAME =
  "Chevrolet Color Archive community photos, v1";
export const COMMUNITY_PHOTO_RELEASE_URL =
  `https://github.com/${EXPECTED_GITHUB_OWNER}/${EXPECTED_GITHUB_REPOSITORY}/releases/tag/${COMMUNITY_PHOTO_RELEASE_TAG}`;
export const COMMUNITY_PHOTO_DOWNLOAD_BASE =
  `https://github.com/${EXPECTED_GITHUB_OWNER}/${EXPECTED_GITHUB_REPOSITORY}/releases/download/${COMMUNITY_PHOTO_RELEASE_TAG}`;

const GITHUB_API_BASE = "https://api.github.com";
const GITHUB_UPLOAD_BASE = "https://uploads.github.com";
const MAX_RELEASE_ASSET_BYTES = 25 * 1024 * 1024;

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function requireToken(environment) {
  const token = environment?.GH_TOKEN;
  if (typeof token !== "string" || !token) {
    throw new Error("GH_TOKEN is required only when GitHub Release publication is requested.");
  }
  return token;
}

function githubHeaders(token, extras = {}) {
  return {
    accept: "application/vnd.github+json",
    authorization: `Bearer ${token}`,
    "x-github-api-version": "2022-11-28",
    "user-agent": "chevrolet-color-archive-publisher",
    ...extras,
  };
}

async function readJsonResponse(response, label) {
  try {
    return await response.json();
  } catch {
    throw new Error(`${label} returned invalid JSON.`);
  }
}

async function githubJson(fetchImpl, token, url, options = {}) {
  const response = await fetchImpl(url, {
    ...options,
    headers: githubHeaders(token, options.headers),
    redirect: "error",
    signal: AbortSignal.timeout(30_000),
  });
  return {
    response,
    payload:
      response.status === 204
        ? null
        : await readJsonResponse(response, "GitHub API"),
  };
}

function validateRelease(release) {
  if (
    !release ||
    typeof release !== "object" ||
    !Number.isSafeInteger(release.id) ||
    release.id < 1 ||
    release.tag_name !== COMMUNITY_PHOTO_RELEASE_TAG ||
    release.draft === true ||
    release.prerelease === true
  ) {
    throw new Error("GitHub returned an invalid community photo Release.");
  }
  return release;
}

export async function verifyGitHubReleaseTarget({
  environment = process.env,
  fetchImpl = fetch,
}) {
  const token = requireToken(environment);
  const { response, payload } = await githubJson(
    fetchImpl,
    token,
    `${GITHUB_API_BASE}/user`,
  );
  if (!response.ok || payload?.login !== EXPECTED_GITHUB_OWNER) {
    throw new Error(
      `GH_TOKEN must authenticate as ${EXPECTED_GITHUB_OWNER}; no Release asset was uploaded.`,
    );
  }
  return {
    verified: true,
    owner: EXPECTED_GITHUB_OWNER,
    repository: EXPECTED_GITHUB_REPOSITORY,
    tag: COMMUNITY_PHOTO_RELEASE_TAG,
  };
}

async function getOrCreateRelease({ token, fetchImpl }) {
  const releaseUrl =
    `${GITHUB_API_BASE}/repos/${EXPECTED_GITHUB_OWNER}/${EXPECTED_GITHUB_REPOSITORY}` +
    `/releases/tags/${COMMUNITY_PHOTO_RELEASE_TAG}`;
  const existing = await githubJson(fetchImpl, token, releaseUrl);
  if (existing.response.ok) return validateRelease(existing.payload);
  if (existing.response.status !== 404) {
    throw new Error(
      `GitHub Release lookup failed with HTTP ${existing.response.status}.`,
    );
  }

  const created = await githubJson(
    fetchImpl,
    token,
    `${GITHUB_API_BASE}/repos/${EXPECTED_GITHUB_OWNER}/${EXPECTED_GITHUB_REPOSITORY}/releases`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        tag_name: COMMUNITY_PHOTO_RELEASE_TAG,
        target_commitish: "main",
        name: COMMUNITY_PHOTO_RELEASE_NAME,
        body:
          "Reviewed community photo assets and immutable attribution receipts for the Chevrolet Color Archive.",
        draft: false,
        prerelease: false,
      }),
    },
  );
  if (created.response.status === 422) {
    const raced = await githubJson(fetchImpl, token, releaseUrl);
    if (raced.response.ok) return validateRelease(raced.payload);
  }
  if (!created.response.ok) {
    throw new Error(
      `GitHub Release creation failed with HTTP ${created.response.status}.`,
    );
  }
  return validateRelease(created.payload);
}

async function listReleaseAssets({ releaseId, token, fetchImpl }) {
  const assets = [];
  for (let page = 1; page <= 100; page += 1) {
    const { response, payload } = await githubJson(
      fetchImpl,
      token,
      `${GITHUB_API_BASE}/repos/${EXPECTED_GITHUB_OWNER}/${EXPECTED_GITHUB_REPOSITORY}` +
        `/releases/${releaseId}/assets?per_page=100&page=${page}`,
    );
    if (!response.ok || !Array.isArray(payload)) {
      throw new Error(
        `GitHub Release asset listing failed with HTTP ${response.status}.`,
      );
    }
    assets.push(...payload);
    if (payload.length < 100) return assets;
  }
  throw new Error("GitHub Release asset listing exceeded its pagination limit.");
}

async function readBoundedAsset(response, expectedBytes) {
  const length = Number(response.headers.get("content-length"));
  if (Number.isFinite(length) && length !== expectedBytes) {
    throw new Error("Existing GitHub Release asset has an unexpected byte count.");
  }
  if (!response.body) throw new Error("Existing GitHub Release asset has no body.");
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > expectedBytes || total > MAX_RELEASE_ASSET_BYTES) {
        throw new Error("Existing GitHub Release asset exceeded its expected size.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  if (total !== expectedBytes) {
    throw new Error("Existing GitHub Release asset has an unexpected byte count.");
  }
  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)), total);
}

async function verifyExistingAsset({ asset, planned, fetchImpl }) {
  if (
    asset?.name !== planned.name ||
    asset?.state !== "uploaded" ||
    asset?.size !== planned.sizeBytes ||
    asset?.browser_download_url !== planned.url
  ) {
    throw new Error(`GitHub Release asset conflict for ${planned.name}.`);
  }
  const apiDigest =
    typeof asset.digest === "string" && asset.digest.startsWith("sha256:")
      ? asset.digest.slice("sha256:".length)
      : null;
  if (apiDigest && apiDigest !== planned.sha256) {
    throw new Error(`GitHub Release asset digest conflict for ${planned.name}.`);
  }
  if (!apiDigest) {
    const response = await fetchImpl(planned.url, {
      redirect: "follow",
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) {
      throw new Error(
        `Existing GitHub Release asset verification failed with HTTP ${response.status}.`,
      );
    }
    if (response.url) {
      const finalUrl = new URL(response.url);
      if (
        finalUrl.protocol !== "https:" ||
        ![
          "github.com",
          "release-assets.githubusercontent.com",
          "objects.githubusercontent.com",
        ].includes(finalUrl.hostname.toLowerCase())
      ) {
        throw new Error("GitHub Release asset redirected to an untrusted host.");
      }
    }
    const bytes = await readBoundedAsset(response, planned.sizeBytes);
    if (sha256(bytes) !== planned.sha256) {
      throw new Error(`GitHub Release asset digest conflict for ${planned.name}.`);
    }
  }
}

async function uploadReleaseAsset({ releaseId, planned, token, fetchImpl }) {
  const uploadUrl =
    `${GITHUB_UPLOAD_BASE}/repos/${EXPECTED_GITHUB_OWNER}/${EXPECTED_GITHUB_REPOSITORY}` +
    `/releases/${releaseId}/assets?name=${encodeURIComponent(planned.name)}`;
  const response = await fetchImpl(uploadUrl, {
    method: "POST",
    headers: githubHeaders(token, {
      accept: "application/vnd.github+json",
      "content-type": planned.mediaType,
      "content-length": String(planned.sizeBytes),
    }),
    body: planned.bytes,
    redirect: "error",
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) {
    return { uploaded: false, status: response.status };
  }
  const asset = await readJsonResponse(response, "GitHub Release upload");
  await verifyExistingAsset({ asset, planned, fetchImpl });
  return { uploaded: true, asset };
}

function validatePublication(publication) {
  if (
    !publication ||
    typeof publication !== "object" ||
    publication.release?.owner !== EXPECTED_GITHUB_OWNER ||
    publication.release?.repository !== EXPECTED_GITHUB_REPOSITORY ||
    publication.release?.tag !== COMMUNITY_PHOTO_RELEASE_TAG ||
    !Array.isArray(publication.releaseUploadAssets) ||
    !publication.releaseUploadAssets.length
  ) {
    throw new Error("Publication does not target the canonical community photo Release.");
  }
  const names = new Set();
  for (const asset of publication.releaseUploadAssets) {
    if (
      !asset ||
      typeof asset !== "object" ||
      typeof asset.name !== "string" ||
      !/^[A-Za-z0-9._-]+$/.test(asset.name) ||
      names.has(asset.name) ||
      !(asset.bytes instanceof Uint8Array) ||
      asset.bytes.length < 1 ||
      asset.bytes.length > MAX_RELEASE_ASSET_BYTES ||
      asset.sizeBytes !== asset.bytes.length ||
      typeof asset.sha256 !== "string" ||
      !/^[a-f0-9]{64}$/.test(asset.sha256) ||
      sha256(asset.bytes) !== asset.sha256 ||
      asset.url !== `${COMMUNITY_PHOTO_DOWNLOAD_BASE}/${asset.name}`
    ) {
      throw new Error("Publication contains invalid GitHub Release asset metadata.");
    }
    names.add(asset.name);
  }
  return publication.releaseUploadAssets;
}

export function createGitHubReleasePublisher({
  environment = process.env,
  fetchImpl = fetch,
} = {}) {
  const token = requireToken(environment);
  let targetVerified = false;
  return {
    async verifyTarget() {
      const result = await verifyGitHubReleaseTarget({ environment, fetchImpl });
      targetVerified = true;
      return result;
    },
    async publish(publication) {
      const plannedAssets = validatePublication(publication);
      if (!targetVerified) await this.verifyTarget();
      const release = await getOrCreateRelease({ token, fetchImpl });
      let assets = await listReleaseAssets({
        releaseId: release.id,
        token,
        fetchImpl,
      });
      const existingByName = new Map(assets.map((asset) => [asset.name, asset]));
      const uploadedAssets = [];
      const reusedAssets = [];

      for (const planned of [...plannedAssets].sort((left, right) =>
        left.name.localeCompare(right.name),
      )) {
        let existing = existingByName.get(planned.name);
        if (existing) {
          await verifyExistingAsset({ asset: existing, planned, fetchImpl });
          reusedAssets.push(planned.name);
          continue;
        }

        const uploaded = await uploadReleaseAsset({
          releaseId: release.id,
          planned,
          token,
          fetchImpl,
        });
        if (uploaded.uploaded) {
          uploadedAssets.push(planned.name);
          existingByName.set(planned.name, uploaded.asset);
          continue;
        }
        if (uploaded.status !== 422) {
          throw new Error(
            `GitHub Release upload failed with HTTP ${uploaded.status}.`,
          );
        }
        assets = await listReleaseAssets({
          releaseId: release.id,
          token,
          fetchImpl,
        });
        existing = assets.find((asset) => asset.name === planned.name);
        if (!existing) {
          throw new Error("GitHub reported an asset collision without a matching asset.");
        }
        await verifyExistingAsset({ asset: existing, planned, fetchImpl });
        reusedAssets.push(planned.name);
        existingByName.set(planned.name, existing);
      }

      return {
        published: true,
        releaseTag: COMMUNITY_PHOTO_RELEASE_TAG,
        releaseUrl: COMMUNITY_PHOTO_RELEASE_URL,
        uploadedAssets,
        reusedAssets,
      };
    },
  };
}

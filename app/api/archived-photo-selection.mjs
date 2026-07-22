import commonsManifest from "../../data/photos/commons-release-manifest.json" with { type: "json" };

export const ARCHIVE_RELEASE_OWNER = "ipadmom";
export const ARCHIVE_RELEASE_REPOSITORY = "chevrolet-color-archive";
export const ARCHIVE_RELEASE_TAG = "photo-archive-v1";
export const ARCHIVE_RELEASE_DOWNLOAD_BASE =
  `https://github.com/${ARCHIVE_RELEASE_OWNER}/${ARCHIVE_RELEASE_REPOSITORY}` +
  `/releases/download/${ARCHIVE_RELEASE_TAG}/`;

const candidateIdPattern = /^commons-sha1-[a-f0-9]{20}$/;
const sha256Pattern = /^[a-f0-9]{64}$/;
const maximumArchivedAssetBytes = 25 * 1024 * 1024;

function isPlainRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function exactPinnedReleaseAssetUrl(asset) {
  if (
    typeof asset.release_asset_name !== "string" ||
    !asset.release_asset_name ||
    asset.release_asset_name.includes("/") ||
    asset.release_asset_name.includes("\\")
  ) {
    return null;
  }
  const expected =
    ARCHIVE_RELEASE_DOWNLOAD_BASE + encodeURIComponent(asset.release_asset_name);
  return asset.release_asset_url === expected ? expected : null;
}

function safeLinkedUrl(value, expectedOrigin = undefined) {
  if (typeof value !== "string") return null;
  try {
    const parsed = new URL(value);
    if (parsed.protocol === "http:") parsed.protocol = "https:";
    if (
      parsed.protocol !== "https:" ||
      parsed.username ||
      parsed.password ||
      (expectedOrigin && parsed.origin !== expectedOrigin)
    ) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

function validateManifestAsset(rawAsset) {
  if (!isPlainRecord(rawAsset)) {
    throw new Error("The pinned photo manifest contains an invalid asset.");
  }
  const candidateId = rawAsset.candidate_id;
  const releaseAssetUrl = exactPinnedReleaseAssetUrl(rawAsset);
  const sourcePageUrl = safeLinkedUrl(
    rawAsset.source_page_url,
    "https://commons.wikimedia.org",
  );
  const licenseUrl = safeLinkedUrl(rawAsset.license_url);
  if (
    typeof candidateId !== "string" ||
    !candidateIdPattern.test(candidateId) ||
    rawAsset.release_tag !== ARCHIVE_RELEASE_TAG ||
    !releaseAssetUrl ||
    typeof rawAsset.sha256 !== "string" ||
    !sha256Pattern.test(rawAsset.sha256) ||
    !Number.isSafeInteger(rawAsset.bytes) ||
    rawAsset.bytes < 1 ||
    rawAsset.bytes > maximumArchivedAssetBytes ||
    typeof rawAsset.mime !== "string" ||
    !/^image\/(?:jpeg|png|gif|webp)$/.test(rawAsset.mime) ||
    typeof rawAsset.attribution !== "string" ||
    !rawAsset.attribution.trim() ||
    typeof rawAsset.license !== "string" ||
    !rawAsset.license.trim() ||
    !sourcePageUrl ||
    !licenseUrl ||
    !Array.isArray(rawAsset.selection_contexts)
  ) {
    throw new Error(`Pinned photo candidate ${String(candidateId)} is invalid.`);
  }

  return {
    rawAsset,
    receiptAsset: {
      candidateId,
      sha256: rawAsset.sha256,
      bytes: rawAsset.bytes,
      contentType: rawAsset.mime,
      releaseAssetName: rawAsset.release_asset_name,
      releaseAssetUrl,
      attribution: rawAsset.attribution.trim(),
      license: rawAsset.license.trim(),
      licenseUrl,
      sourcePageUrl,
    },
  };
}

const manifestRelease = commonsManifest.github_release;
if (
  commonsManifest.schema_version !== 1 ||
  !isPlainRecord(manifestRelease) ||
  manifestRelease.owner !== ARCHIVE_RELEASE_OWNER ||
  manifestRelease.repository !== ARCHIVE_RELEASE_REPOSITORY ||
  manifestRelease.tag !== ARCHIVE_RELEASE_TAG ||
  manifestRelease.published !== true ||
  manifestRelease.base_url !== ARCHIVE_RELEASE_DOWNLOAD_BASE ||
  !Array.isArray(commonsManifest.assets)
) {
  throw new Error("The archived photo manifest does not target the pinned Release.");
}

const archivedAssetsById = new Map();
for (const rawAsset of commonsManifest.assets) {
  const validated = validateManifestAsset(rawAsset);
  const id = validated.receiptAsset.candidateId;
  if (archivedAssetsById.has(id)) {
    throw new Error(`Pinned photo candidate ${id} is duplicated.`);
  }
  archivedAssetsById.set(id, validated);
}

export function parseArchivedCandidateIds(value) {
  if (value === undefined) return [];
  if (
    !Array.isArray(value) ||
    value.some(
      (entry) => typeof entry !== "string" || !candidateIdPattern.test(entry),
    )
  ) {
    return null;
  }
  return [...new Set(value)].sort();
}

function matchesArchiveContext(asset, context) {
  return asset.selection_contexts.some(
    (selectionContext) =>
      isPlainRecord(selectionContext) &&
      selectionContext.model_id === context.model &&
      Number(selectionContext.exact_year) === Number(context.year) &&
      (selectionContext.color_id === context.colorId ||
        selectionContext.legacy_color_id === context.colorId),
  );
}

export function buildArchivedSelectionReceipt(context, candidateIds) {
  if (
    !isPlainRecord(context) ||
    typeof context.model !== "string" ||
    !/^\d{4}$/.test(context.year) ||
    typeof context.colorId !== "string" ||
    !Array.isArray(candidateIds) ||
    candidateIds.length < 1
  ) {
    return null;
  }

  const resolved = [];
  for (const candidateId of [...new Set(candidateIds)].sort()) {
    const asset = archivedAssetsById.get(candidateId);
    if (!asset || !matchesArchiveContext(asset.rawAsset, context)) return null;
    resolved.push(asset.receiptAsset);
  }

  return {
    schemaVersion: 1,
    source: "pinned-github-release-manifest",
    release: {
      owner: ARCHIVE_RELEASE_OWNER,
      repository: ARCHIVE_RELEASE_REPOSITORY,
      tag: ARCHIVE_RELEASE_TAG,
      downloadBase: ARCHIVE_RELEASE_DOWNLOAD_BASE,
      manifestSchemaVersion: commonsManifest.schema_version,
    },
    context: {
      model: context.model,
      year: context.year,
      colorId: context.colorId,
    },
    candidates: resolved,
  };
}

export async function parseStoredArchivedSelectionReceipt(
  receiptJson,
  expectedSha256,
  context,
  archivedCandidateIds,
) {
  if (
    typeof receiptJson !== "string" ||
    typeof expectedSha256 !== "string" ||
    !sha256Pattern.test(expectedSha256)
  ) {
    return null;
  }
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(receiptJson),
  );
  const actualSha256 = [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  if (actualSha256 !== expectedSha256) return null;
  let parsed;
  try {
    parsed = JSON.parse(receiptJson);
  } catch {
    return null;
  }
  const rebuilt = buildArchivedSelectionReceipt(context, archivedCandidateIds);
  if (!rebuilt || JSON.stringify(parsed) !== JSON.stringify(rebuilt)) return null;
  return parsed;
}

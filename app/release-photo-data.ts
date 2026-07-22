import commonsManifest from "../data/photos/commons-release-manifest.json";

type SelectionContext = {
  kind: string;
  model_id: string;
  exact_year?: number | null;
  color_id?: string;
  legacy_color_id?: string;
  legacy_id?: string;
  legacy_note?: string;
  legacy_prior_status?: "candidate" | "reviewed";
};

type ManifestAsset = {
  candidate_id: string;
  status: string;
  selection_contexts: SelectionContext[];
  model_ids: string[];
  explicit_year?: number | null;
  source_page_url: string;
  author: string;
  license: string;
  license_url: string;
  attribution: string;
  description?: string | null;
  sha256: string;
  mime: string;
  width: number;
  height: number;
  bytes: number;
  original_filename: string;
  release_tag: string;
  release_asset_name: string;
  release_asset_url: string;
  site_asset_url: string;
  preview_release_asset_url?: string;
};

type ManifestModel = {
  model_id: string;
  name: string;
  representative_asset_ids: string[];
  exact_year_candidates: { year: number; asset_ids: string[] }[];
  asset_ids: string[];
};

type CommonsReleaseManifest = {
  schema_version: number;
  github_release: {
    owner: string;
    repository: string;
    tag: string;
    published: boolean;
    base_url: string;
  };
  run: {
    staged_asset_count: number;
    staged_total_bytes: number;
  };
  models: ManifestModel[];
  assets: ManifestAsset[];
};

export type ArchivedPhoto = {
  id: string;
  alt: string;
  archiveOriginalUrl: string;
  attribution: string;
  bytes: number;
  credit: string;
  description?: string;
  height: number;
  license: string;
  licenseUrl: string;
  modelIds: string[];
  note?: string;
  originalFilename: string;
  selectionContexts: SelectionContext[];
  sha256: string;
  sourceUrl: string;
  src: string;
  status: "candidate" | "reviewed";
  width: number;
  year?: string;
};

const manifest = commonsManifest as CommonsReleaseManifest;
const archiveOwner = "ipadmom";
const archiveRepository = "chevrolet-color-archive";
const archiveReleaseTag = "photo-archive-v1";

if (
  manifest.github_release.owner !== archiveOwner ||
  manifest.github_release.repository !== archiveRepository ||
  manifest.github_release.tag !== archiveReleaseTag
) {
  throw new Error("The Commons photo manifest targets an unexpected pinned Release");
}

const modelNames = new Map(
  manifest.models.map((model) => [model.model_id, model.name]),
);
const expectedReleasePrefix =
  `https://github.com/${archiveOwner}/${archiveRepository}` +
  `/releases/download/${encodeURIComponent(archiveReleaseTag)}/`;

function pinnedReleaseAssetUrl(
  value: string,
  field: string,
  asset: ManifestAsset,
) {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`Photo ${asset.candidate_id} has an invalid ${field}`);
  }

  const assetName = value.slice(expectedReleasePrefix.length);
  if (
    !value.startsWith(expectedReleasePrefix) ||
    parsed.origin !== "https://github.com" ||
    parsed.search ||
    parsed.hash ||
    !assetName ||
    assetName.includes("/") ||
    assetName.includes("\\")
  ) {
    throw new Error(
      `Photo ${asset.candidate_id} does not use the pinned GitHub Release for ${field}`,
    );
  }
  return value;
}

function linkedMetadataUrl(value: string, field: string, asset: ManifestAsset) {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`Photo ${asset.candidate_id} has an invalid ${field}`);
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error(`Photo ${asset.candidate_id} has an invalid ${field}`);
  }
  if (parsed.protocol === "http:") parsed.protocol = "https:";
  return parsed.toString();
}

function photoStatus(asset: ManifestAsset) {
  return asset.selection_contexts.some(
    (context) => context.legacy_prior_status === "reviewed",
  )
    ? "reviewed"
    : "candidate";
}

function photoAlt(asset: ManifestAsset) {
  const model = asset.model_ids
    .map((modelId) => modelNames.get(modelId) ?? modelId)
    .join(" / ");
  const year = asset.explicit_year ? `${asset.explicit_year} ` : "";
  return `${year}Chevrolet ${model} Wikimedia Commons identification reference`;
}

function normalizeAsset(asset: ManifestAsset): ArchivedPhoto {
  if (asset.release_tag !== manifest.github_release.tag) {
    throw new Error(
      `Photo ${asset.candidate_id} has a mismatched GitHub Release tag`,
    );
  }
  const archiveOriginalUrl = pinnedReleaseAssetUrl(
    asset.release_asset_url,
    "release_asset_url",
    asset,
  );
  if (
    archiveOriginalUrl !==
    `${expectedReleasePrefix}${encodeURIComponent(asset.release_asset_name)}`
  ) {
    throw new Error(
      `Photo ${asset.candidate_id} release_asset_url does not match its asset name`,
    );
  }
  const src = pinnedReleaseAssetUrl(asset.site_asset_url, "site_asset_url", asset);
  const intendedSiteAssetUrl =
    asset.preview_release_asset_url ?? asset.release_asset_url;
  if (src !== intendedSiteAssetUrl) {
    throw new Error(
      `Photo ${asset.candidate_id} site_asset_url does not match its archived asset`,
    );
  }
  if (
    !asset.source_page_url.startsWith("https://commons.wikimedia.org/wiki/File:") ||
    !asset.author.trim() ||
    !asset.attribution.trim() ||
    !asset.license.trim()
  ) {
    throw new Error(
      `Photo ${asset.candidate_id} is missing required Commons attribution metadata`,
    );
  }
  return {
    id: asset.candidate_id,
    alt: photoAlt(asset),
    archiveOriginalUrl,
    attribution: asset.attribution,
    bytes: asset.bytes,
    credit: asset.author,
    description: asset.description ?? undefined,
    height: asset.height,
    license: asset.license,
    licenseUrl: linkedMetadataUrl(asset.license_url, "license_url", asset),
    modelIds: asset.model_ids,
    note: asset.selection_contexts.find((context) => context.legacy_note)
      ?.legacy_note,
    originalFilename: asset.original_filename,
    selectionContexts: asset.selection_contexts,
    sha256: asset.sha256,
    sourceUrl: linkedMetadataUrl(asset.source_page_url, "source_page_url", asset),
    src,
    status: photoStatus(asset),
    width: asset.width,
    year: asset.explicit_year ? String(asset.explicit_year) : undefined,
  };
}

export const archivedPhotos = manifest.assets.map(normalizeAsset);
const archivedPhotoById = new Map(archivedPhotos.map((photo) => [photo.id, photo]));
const manifestModelById = new Map(
  manifest.models.map((model) => [model.model_id, model]),
);

function uniquePhotos(ids: string[]) {
  const seen = new Set<string>();
  return ids.flatMap((id) => {
    if (seen.has(id)) return [];
    seen.add(id);
    const photo = archivedPhotoById.get(id);
    return photo ? [photo] : [];
  });
}

export function isExactYearPhoto(
  photo: ArchivedPhoto,
  modelId: string,
  year: string,
) {
  return photo.selectionContexts.some(
    (context) =>
      context.model_id === modelId && context.exact_year === Number(year),
  );
}

export function archivedModelYearPhotos(
  modelId: string,
  year: string,
  maximum = 6,
) {
  const model = manifestModelById.get(modelId);
  if (!model) return [];
  const exactIds = archivedPhotos
    .filter((photo) => isExactYearPhoto(photo, modelId, year))
    .map((photo) => photo.id);
  return uniquePhotos(exactIds).slice(0, maximum);
}

export function archivedColorPhotos(
  modelId: string,
  year: string,
  colorId: string,
) {
  return archivedPhotos.filter((photo) =>
    photo.selectionContexts.some(
      (context) =>
        context.model_id === modelId &&
        context.exact_year === Number(year) &&
        (context.color_id === colorId || context.legacy_color_id === colorId),
    ),
  );
}

export const archivedPhotoStats = {
  assetCount: manifest.assets.length,
  modelCount: manifest.models.filter((model) => model.asset_ids.length > 0)
    .length,
  originalBytes: manifest.run.staged_total_bytes,
  releaseTag: archiveReleaseTag,
  releaseUrl: `https://github.com/${archiveOwner}/${archiveRepository}/releases/tag/${archiveReleaseTag}`,
};

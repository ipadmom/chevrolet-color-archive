export const ARCHIVE_RELEASE_OWNER: "ipadmom";
export const ARCHIVE_RELEASE_REPOSITORY: "chevrolet-color-archive";
export const ARCHIVE_RELEASE_TAG: "photo-archive-v1";
export const ARCHIVE_RELEASE_DOWNLOAD_BASE: "https://github.com/ipadmom/chevrolet-color-archive/releases/download/photo-archive-v1/";

export type ArchivedSelectionContext = {
  model: string;
  year: string;
  colorId: string;
};

export type ArchivedSelectionCandidate = {
  candidateId: string;
  sha256: string;
  bytes: number;
  contentType: string;
  releaseAssetName: string;
  releaseAssetUrl: string;
  attribution: string;
  license: string;
  licenseUrl: string;
  sourcePageUrl: string;
};

export type ArchivedSelectionReceipt = {
  schemaVersion: 1;
  source: "pinned-github-release-manifest";
  release: {
    owner: "ipadmom";
    repository: "chevrolet-color-archive";
    tag: "photo-archive-v1";
    downloadBase: typeof ARCHIVE_RELEASE_DOWNLOAD_BASE;
    manifestSchemaVersion: 1;
  };
  context: ArchivedSelectionContext;
  candidates: ArchivedSelectionCandidate[];
};

export function parseArchivedCandidateIds(value: unknown): string[] | null;
export function buildArchivedSelectionReceipt(
  context: ArchivedSelectionContext,
  candidateIds: string[],
): ArchivedSelectionReceipt | null;
export function parseStoredArchivedSelectionReceipt(
  receiptJson: unknown,
  expectedSha256: unknown,
  context: ArchivedSelectionContext,
  archivedCandidateIds: string[],
): Promise<ArchivedSelectionReceipt | null>;

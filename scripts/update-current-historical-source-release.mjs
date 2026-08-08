import { createHash } from "node:crypto";
import {
  copyFile,
  mkdir,
  readFile,
  readdir,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(new URL("../", import.meta.url)));
const auditRoot = path.join(root, "data/audits");
const manifestPath = path.join(
  root,
  "data/sources/brochure-source-release-manifest.json",
);
const artifactLedgerPath = path.join(
  root,
  "data/sources/gm-heritage-chevrolet-artifacts.json",
);
const crawlerObjectRoot = path.join(
  root,
  "tmp/crawler-state/objects/sha256",
);
const stagingRoot = path.join(root, "tmp/current-historical-source-release");
const proposedManifestPath = path.join(stagingRoot, "proposed-release-manifest.json");
const releasePlanPath = path.join(stagingRoot, "release-plan.json");

const releaseDownloadBase =
  "https://github.com/ipadmom/chevrolet-color-archive/releases/download/" +
  "brochure-source-archive-v1/";
const mode = process.argv[2] ?? "stage";
if (!new Set(["stage", "finalize"]).has(mode)) {
  throw new Error("usage: node update-current-historical-source-release.mjs [stage|finalize]");
}

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const readJson = (filePath) => readFile(filePath, "utf8").then(JSON.parse);
const archiveAssetName = (source) => {
  for (const candidate of [source.archive_url, source.planned_archive_url]) {
    if (!candidate?.startsWith(releaseDownloadBase)) continue;
    return decodeURIComponent(new URL(candidate).pathname.split("/").at(-1));
  }
  return source.source_id.startsWith("gm-heritage-")
    ? `${source.source_id.replace(/^gm-heritage-/, "")}-vehicle-information-kit-gm.pdf`
    : `${source.source_id}.pdf`;
};
const normalizedSource = (source, ledgerById, auditPath) => {
  const ledger = ledgerById.get(source.source_id);
  const artifactSha256 = source.sha256 ?? source.artifact_sha256;
  const artifactBytes = source.bytes ?? source.artifact_bytes;
  const pdfPageCount = source.pdf_page_count;
  const crawlerObjectRelpath =
    source.crawler_archive_relpath ??
    source.crawler_object_relpath ??
    ledger?.crawler_object_relpath;
  const originalSourceUrl =
    source.url ?? source.direct_url ?? ledger?.canonical_url ?? null;
  if (!artifactSha256 || !artifactBytes || !pdfPageCount) {
    throw new Error(`incomplete retained artifact metadata: ${source.source_id}`);
  }
  if (ledger?.artifact_sha256 && ledger.artifact_sha256 !== artifactSha256) {
    throw new Error(`artifact hash conflicts with crawler ledger: ${source.source_id}`);
  }
  if (ledger?.byte_length && ledger.byte_length !== artifactBytes) {
    throw new Error(`artifact size conflicts with crawler ledger: ${source.source_id}`);
  }
  if (ledger?.pdf_page_count && ledger.pdf_page_count !== pdfPageCount) {
    throw new Error(`page count conflicts with crawler ledger: ${source.source_id}`);
  }
  const assetName = archiveAssetName(source);
  return {
    source,
    auditPath,
    sourceId: source.source_id,
    assetName,
    archiveUrl: `${releaseDownloadBase}${assetName}`,
    artifactSha256,
    artifactBytes,
    pdfPageCount,
    crawlerObjectRelpath,
    originalSourceUrl,
  };
};
const manifestEntry = (record) => ({
  asset_name: record.assetName,
  archive_url: record.archiveUrl,
  sha256: record.artifactSha256,
  bytes: record.artifactBytes,
  role: "current_nameplate_color_audit_source_artifact",
  source_id: record.sourceId,
  original_source_url: record.originalSourceUrl,
  pdf_page_count: record.pdfPageCount,
});
const addIfMissing = (entries, entry) => {
  const byName = entries.find(({ asset_name: assetName }) => assetName === entry.asset_name);
  const byHash = entries.find(({ sha256: digest }) => digest === entry.sha256);
  const existing = byName ?? byHash;
  if (!existing) {
    entries.push(entry);
    return true;
  }
  if (
    existing.asset_name !== entry.asset_name ||
    existing.sha256 !== entry.sha256 ||
    existing.bytes !== entry.bytes
  ) {
    throw new Error(`conflicting Release metadata: ${entry.asset_name}`);
  }
  return false;
};
const snapshotText = (entries) =>
  [...entries]
    .sort((left, right) => left.asset_name.localeCompare(right.asset_name))
    .map((entry) => `${entry.sha256}  ${entry.asset_name}\n`)
    .join("");
const ensureChecksumSnapshot = (entries) => {
  const existing = entries.find((candidate) => {
    if (
      candidate.role !== "checksum_manifest_snapshot" ||
      candidate.covered_asset_count !== entries.length - 1
    ) {
      return false;
    }
    const covered = entries.filter((entry) => entry !== candidate);
    const bytes = Buffer.from(snapshotText(covered), "utf8");
    return candidate.sha256 === sha256(bytes) && candidate.bytes === bytes.length;
  });
  if (existing) {
    return {
      entry: existing,
      bytes: Buffer.from(snapshotText(entries.filter((entry) => entry !== existing)), "utf8"),
      added: false,
    };
  }
  const coveredAssetCount = entries.length;
  const bytes = Buffer.from(snapshotText(entries), "utf8");
  const assetName = `source-sha256-manifest-${coveredAssetCount}-reviewed.txt`;
  const entry = {
    asset_name: assetName,
    archive_url: `${releaseDownloadBase}${assetName}`,
    sha256: sha256(bytes),
    bytes: bytes.length,
    role: "checksum_manifest_snapshot",
    source_id: null,
    original_source_url: null,
    covered_asset_count: coveredAssetCount,
  };
  entries.push(entry);
  return { entry, bytes, added: true };
};

const [manifest, artifactLedger, auditNames] = await Promise.all([
  readJson(manifestPath),
  readJson(artifactLedgerPath),
  readdir(auditRoot),
]);
const ledgerById = new Map(
  artifactLedger.entries.map((entry) => [entry.source_id, entry]),
);
const auditPaths = auditNames
  .filter((name) =>
    (name.startsWith("current-") || name === "suburban-1935-1968-2006.json") &&
    name.endsWith(".json")
  )
  .map((name) => path.join(auditRoot, name));
const audits = await Promise.all(
  auditPaths.map(async (auditPath) => ({ auditPath, audit: await readJson(auditPath) })),
);
const records = [];
for (const { auditPath, audit } of audits) {
  if (!Array.isArray(audit.sources)) continue;
  for (const source of audit.sources) {
    if (!(source.sha256 ?? source.artifact_sha256)) continue;
    const sourceUrl = source.url ?? source.direct_url;
    if (!sourceUrl || !source.pdf_page_count) continue;
    if (
      source.content_type &&
      source.content_type !== "application/pdf" &&
      !sourceUrl.toLocaleLowerCase().endsWith(".pdf")
    ) continue;
    records.push(normalizedSource(source, ledgerById, auditPath));
  }
}
const recordsBySourceId = new Map();
const recordsByAssetName = new Map();
for (const record of records) {
  const priorSource = recordsBySourceId.get(record.sourceId);
  if (priorSource && priorSource.artifactSha256 !== record.artifactSha256) {
    throw new Error(`duplicate source ID with different artifacts: ${record.sourceId}`);
  }
  const priorAsset = recordsByAssetName.get(record.assetName);
  if (priorAsset && priorAsset.artifactSha256 !== record.artifactSha256) {
    throw new Error(`duplicate asset name with different artifacts: ${record.assetName}`);
  }
  recordsBySourceId.set(record.sourceId, record);
  recordsByAssetName.set(record.assetName, record);
}
const uniqueRecords = [...recordsBySourceId.values()].sort((left, right) =>
  left.assetName.localeCompare(right.assetName),
);

const entries = structuredClone(manifest.entries);
for (const record of uniqueRecords) {
  const existing = entries.find((entry) =>
    entry.source_id === record.sourceId || entry.sha256 === record.artifactSha256,
  );
  if (!existing) continue;
  record.assetName = existing.asset_name;
  record.archiveUrl = existing.archive_url;
}
const addedRecords = uniqueRecords.filter((record) =>
  addIfMissing(entries, manifestEntry(record)),
);
const checksum = ensureChecksumSnapshot(entries);
const proposedManifest = {
  ...manifest,
  captured_at: "2026-08-07",
  scope: manifest.scope.replace(
    / It also retains \d+ official GM Heritage source artifacts used by audited current Chevrolet nameplates\./,
    "",
  ) +
    ` It also retains ${uniqueRecords.length} source artifacts used by audited current Chevrolet nameplates.`,
  entries: entries.sort((left, right) =>
    left.asset_name.localeCompare(right.asset_name),
  ),
};

await mkdir(stagingRoot, { recursive: true });
for (const record of addedRecords) {
  if (!record.crawlerObjectRelpath) continue;
  const sourcePath = path.join(crawlerObjectRoot, record.crawlerObjectRelpath);
  const sourceBytes = await readFile(sourcePath);
  if (
    sourceBytes.length !== record.artifactBytes ||
    sha256(sourceBytes) !== record.artifactSha256
  ) {
    throw new Error(`retained crawler object failed integrity: ${record.sourceId}`);
  }
  const targetPath = path.join(stagingRoot, record.assetName);
  await copyFile(sourcePath, targetPath);
  const targetStat = await stat(targetPath);
  if (targetStat.size !== record.artifactBytes) {
    throw new Error(`staged artifact size mismatch: ${record.assetName}`);
  }
}
const checksumPath = path.join(stagingRoot, checksum.entry.asset_name);
await writeFile(checksumPath, checksum.bytes);
const plan = {
  repository: "ipadmom/chevrolet-color-archive",
  release_tag: "brochure-source-archive-v1",
  source_asset_count: addedRecords.length,
  source_assets: addedRecords.map((record) => ({
    asset_name: record.assetName,
    sha256: record.artifactSha256,
    bytes: record.artifactBytes,
    source_id: record.sourceId,
  })),
  checksum_asset: checksum.entry,
  final_manifest_entry_count: proposedManifest.entries.length,
};
await Promise.all([
  writeFile(proposedManifestPath, `${JSON.stringify(proposedManifest, null, 2)}\n`, "utf8"),
  writeFile(releasePlanPath, `${JSON.stringify(plan, null, 2)}\n`, "utf8"),
]);

if (mode === "finalize") {
  const auditRecords = new Map(
    uniqueRecords.map((record) => [record.sourceId, record]),
  );
  for (const { auditPath, audit } of audits) {
    let changed = false;
    for (const source of audit.sources ?? []) {
      const record = auditRecords.get(source.source_id);
      if (!record) continue;
      if (source.archive_url !== record.archiveUrl) {
        source.archive_url = record.archiveUrl;
        changed = true;
      }
      if ("archive_status" in source && source.archive_status !== "archived_in_public_release") {
        source.archive_status = "archived_in_public_release";
        changed = true;
      }
    }
    if (changed) {
      await writeFile(auditPath, `${JSON.stringify(audit, null, 2)}\n`, "utf8");
    }
  }
  await writeFile(
    manifestPath,
    `${JSON.stringify(proposedManifest, null, 2)}\n`,
    "utf8",
  );
}

console.log(JSON.stringify({
  mode,
  audited_source_count: uniqueRecords.length,
  staged_source_asset_count: addedRecords.length,
  checksum_asset: checksum.entry.asset_name,
  checksum_added: checksum.added,
  final_manifest_entry_count: proposedManifest.entries.length,
}));

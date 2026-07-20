import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { evaluateRights } from "./rights.mjs";

const ALLOWED_FILE_HOSTS = new Set(["upload.wikimedia.org"]);

function safeStem(candidate) {
  const title = String(candidate.title || candidate.id)
    .replace(/\.[a-z0-9]{2,5}$/i, "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
  return `${candidate.id}-${title || "image"}`;
}

function extensionFor(candidate, contentType) {
  const fromUrl = path.extname(new URL(candidate.fileUrl).pathname).toLowerCase();
  if (/^\.(?:jpe?g|png|webp|gif|tiff?)$/.test(fromUrl)) {
    return fromUrl === ".jpeg" ? ".jpg" : fromUrl;
  }
  const byMime = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/tiff": ".tiff",
  };
  return byMime[contentType] ?? ".img";
}

async function existingDigest(filePath) {
  try {
    return createHash("sha256")
      .update(await readFile(filePath))
      .digest("hex");
  } catch (error) {
    if (error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

export async function downloadCandidate({
  candidate,
  outputDir,
  fetchImpl = fetch,
  maxBytes = 50 * 1024 * 1024,
  now = () => new Date().toISOString(),
}) {
  const rights = evaluateRights(candidate.license);
  if (!rights.downloadAllowed) {
    return {
      candidateId: candidate.id,
      status: "skipped-rights",
      reason: rights.reason,
    };
  }

  const sourceUrl = new URL(candidate.fileUrl);
  if (sourceUrl.protocol !== "https:" || !ALLOWED_FILE_HOSTS.has(sourceUrl.host)) {
    return {
      candidateId: candidate.id,
      status: "skipped-source",
      reason: `File URL is not an approved Wikimedia upload host: ${sourceUrl.host}`,
    };
  }

  const response = await fetchImpl(sourceUrl, {
    headers: {
      accept: "image/*",
      "user-agent":
        "ChevroletColorArchive/0.1 (rights-clear Wikimedia Commons download)",
    },
  });
  if (!response.ok) {
    throw new Error(
      `Image download returned ${response.status} ${response.statusText}`,
    );
  }

  const finalUrl = new URL(response.url || sourceUrl);
  if (
    finalUrl.protocol !== "https:" ||
    !ALLOWED_FILE_HOSTS.has(finalUrl.host)
  ) {
    throw new Error(`Download redirected to an unapproved host: ${finalUrl.host}`);
  }

  const contentType = (response.headers.get("content-type") ?? "")
    .split(";")[0]
    .trim()
    .toLowerCase();
  if (!contentType.startsWith("image/")) {
    throw new Error(`Refusing non-image response: ${contentType || "unknown"}`);
  }

  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new Error(
      `Refusing ${declaredLength}-byte image; limit is ${maxBytes} bytes`,
    );
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > maxBytes) {
    throw new Error(
      `Refusing ${bytes.length}-byte image; limit is ${maxBytes} bytes`,
    );
  }

  await mkdir(outputDir, { recursive: true });
  const filePath = path.join(
    outputDir,
    `${safeStem(candidate)}${extensionFor(candidate, contentType)}`,
  );
  const digest = createHash("sha256").update(bytes).digest("hex");
  const previousDigest = await existingDigest(filePath);
  if (previousDigest && previousDigest !== digest) {
    throw new Error(`Refusing to overwrite a different existing file: ${filePath}`);
  }
  if (!previousDigest) {
    await writeFile(filePath, bytes, { flag: "wx" });
  }

  const sidecarPath = `${filePath}.license.json`;
  const sidecar = {
    candidateId: candidate.id,
    downloadedAt: now(),
    localFile: path.basename(filePath),
    sha256: digest,
    bytes: bytes.length,
    source: {
      originalPageUrl: candidate.originalPageUrl,
      fileUrl: candidate.fileUrl,
    },
    creator: candidate.creator,
    license: candidate.license,
    attribution: candidate.attribution,
    context: candidate.context,
    disclaimer:
      "This file is a photo candidate, not evidence of factory paint availability or originality.",
  };
  if (!(await existingDigest(sidecarPath))) {
    await writeFile(
      sidecarPath,
      `${JSON.stringify(sidecar, null, 2)}\n`,
      { encoding: "utf8", flag: "wx" },
    );
  }

  return {
    candidateId: candidate.id,
    status: previousDigest ? "already-present" : "downloaded",
    filePath,
    sidecarPath,
    sha256: digest,
    bytes: bytes.length,
  };
}


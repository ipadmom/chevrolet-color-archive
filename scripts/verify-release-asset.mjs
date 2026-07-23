#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

const [remoteUrl, localPath] = process.argv.slice(2);
if (!remoteUrl || !localPath) {
  console.error(
    "Usage: node scripts/verify-release-asset.mjs <release-asset-url> <local-path>",
  );
  process.exitCode = 2;
} else {
  const [response, localBytes] = await Promise.all([
    fetch(remoteUrl, {
      redirect: "follow",
      headers: { "user-agent": "chevrolet-color-archive-release-audit" },
    }),
    readFile(localPath),
  ]);
  if (!response.ok) {
    throw new Error(
      `Release asset request failed: ${response.status} ${response.statusText}`,
    );
  }
  const remoteBytes = Buffer.from(await response.arrayBuffer());
  const result = {
    status:
      remoteBytes.length === localBytes.length &&
      sha256(remoteBytes) === sha256(localBytes)
        ? "ok"
        : "mismatch",
    remote_bytes: remoteBytes.length,
    local_bytes: localBytes.length,
    remote_sha256: sha256(remoteBytes),
    local_sha256: sha256(localBytes),
  };
  console.log(JSON.stringify(result));
  if (result.status !== "ok") process.exitCode = 1;
}

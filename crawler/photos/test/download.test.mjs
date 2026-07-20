import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { downloadCandidate } from "../download.mjs";

function candidate(license) {
  return {
    id: "commons-page-1",
    title: "Camaro photograph.jpg",
    originalPageUrl: "https://commons.wikimedia.org/wiki/File:Camaro.jpg",
    fileUrl:
      "https://upload.wikimedia.org/wikipedia/commons/a/aa/Camaro.jpg",
    creator: { display: "Alice Example", rawHtml: null },
    license,
    attribution: { text: "Alice Example - Camaro - CC BY 4.0" },
    context: {
      make: "Chevrolet",
      model: "Camaro",
      year: "1969",
      color: "Hugger Orange",
    },
  };
}

test("does not fetch a candidate that fails the rights gate", async () => {
  let fetched = false;
  const result = await downloadCandidate({
    candidate: candidate({ shortName: "CC BY-NC 4.0" }),
    outputDir: "unused",
    fetchImpl: async () => {
      fetched = true;
      throw new Error("must not fetch");
    },
  });

  assert.equal(fetched, false);
  assert.equal(result.status, "skipped-rights");
});

test("downloads an allowlisted image and writes an attribution sidecar", async () => {
  const outputDir = await mkdtemp(path.join(os.tmpdir(), "chevy-photo-test-"));
  const bytes = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
  try {
    const result = await downloadCandidate({
      candidate: candidate({ shortName: "CC BY 4.0" }),
      outputDir,
      fetchImpl: async () =>
        new Response(bytes, {
          status: 200,
          headers: {
            "content-type": "image/jpeg",
            "content-length": String(bytes.length),
          },
        }),
      now: () => "2026-07-20T00:00:00.000Z",
    });

    assert.equal(result.status, "downloaded");
    assert.deepEqual(await readFile(result.filePath), bytes);
    const sidecar = JSON.parse(await readFile(result.sidecarPath, "utf8"));
    assert.equal(sidecar.source.originalPageUrl, candidate({}).originalPageUrl);
    assert.equal(sidecar.context.color, "Hugger Orange");
    assert.match(sidecar.disclaimer, /not evidence/i);
  } finally {
    await rm(outputDir, { recursive: true, force: true });
  }
});

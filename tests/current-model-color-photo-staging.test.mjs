import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import test from "node:test";
import {
  parseArgs,
  titleFromSourcePage,
  titleKey,
  validateMetadataMatch,
  validateQueue,
} from "../scripts/stage-current-model-color-photo-queue.mjs";
import { verifyCandidateBytes } from "../scripts/crawl-wikimedia-release-photos.mjs";

const execFileAsync = promisify(execFile);
const repositoryRoot = path.resolve(fileURLToPath(new URL("../", import.meta.url)));
const script = path.join(
  repositoryRoot,
  "scripts",
  "stage-current-model-color-photo-queue.mjs",
);

test("current-model color-photo staging exposes side-effect-free help", async () => {
  const result = await execFileAsync(process.execPath, [script, "--help"], {
    cwd: repositoryRoot,
  });
  assert.match(result.stdout, /does not upload anything/i);
  assert.match(result.stdout, /--raw-response PATH/);
});

test("current-model color-photo staging accepts only Commons File pages", () => {
  assert.equal(
    titleFromSourcePage(
      "https://commons.wikimedia.org/wiki/File:2024_Chevrolet_Trax_LS,_front_right.jpg",
    ),
    "File:2024_Chevrolet_Trax_LS,_front_right.jpg",
  );
  assert.throws(
    () => titleFromSourcePage("https://example.com/wiki/File:Trax.jpg"),
    /not a Wikimedia Commons page/,
  );
  assert.throws(
    () => titleFromSourcePage("https://commons.wikimedia.org/wiki/Category:Trax"),
    /not a Commons File page/,
  );
});

test("current-model color-photo staging normalizes Commons title keys", () => {
  assert.equal(titleKey(" File:2024_Chevrolet_Trax.jpg "), "file:2024 chevrolet trax.jpg");
});

test("current-model color-photo staging keeps every configured path inside the repository", () => {
  const options = parseArgs([
    "--queue",
    "data/photos/current-model-color-photo-crawl-queue.json",
  ]);
  assert.ok(options.queue.startsWith(repositoryRoot));
  assert.throws(
    () => parseArgs(["--manifest", "../../outside.json"]),
    /must stay within the repository/,
  );
});

function queueCandidate(overrides = {}) {
  return {
    candidate_key: "2024-trax-cacti-green-front-left",
    model_id: "trax",
    model_year: 2024,
    color_label: "Cacti Green",
    source_page_url:
      "https://commons.wikimedia.org/wiki/File:2024_Chevrolet_Trax_in_Cacti_Green.jpg",
    metadata_evidence:
      "2024 Chevrolet Trax photographed in Pennsylvania. Finished in Cacti Green.",
    palette_source_id: "gm-fleet-guide-us-2024-v3",
    palette_source_url: "https://example.invalid/2024-gm-guide.pdf",
    palette_locator: "PDF page 36, EXTERIOR COLORS.",
    ...overrides,
  };
}

test("current-model color-photo queue validation fails closed before network access", () => {
  const catalog = { models: [{ id: "trax" }] };
  const valid = { schema_version: 2, queued_candidates: [queueCandidate()] };
  assert.equal(validateQueue(valid, catalog).get("trax").id, "trax");

  for (const field of [
    "candidate_key",
    "model_id",
    "color_label",
    "source_page_url",
    "metadata_evidence",
    "palette_source_id",
    "palette_source_url",
    "palette_locator",
  ]) {
    const invalid = structuredClone(valid);
    invalid.queued_candidates[0][field] = "";
    assert.throws(() => validateQueue(invalid, catalog), new RegExp(field));
  }

  assert.throws(
    () =>
      validateQueue(
        {
          schema_version: 2,
          queued_candidates: [
            queueCandidate(),
            queueCandidate({
              source_page_url:
                "https://commons.wikimedia.org/wiki/File:Duplicate_key.jpg",
            }),
          ],
        },
        catalog,
      ),
    /duplicate candidate_key/,
  );
});

test("current-model color-photo metadata validation requires the full retained caption", () => {
  const queueItem = queueCandidate();
  assert.doesNotThrow(() =>
    validateMetadataMatch(
      {
        description:
          "<p>2024 Chevrolet Trax photographed in Pennsylvania.</p> Finished in Cacti Green.",
      },
      queueItem,
    ),
  );
  assert.throws(
    () =>
      validateMetadataMatch(
        { description: "Unidentified vehicle. Finished in Cacti Green." },
        queueItem,
      ),
    /metadata evidence drifted/,
  );
});

test("Commons candidate bytes require exact size and SHA-1", () => {
  const bytes = Buffer.from("verified Wikimedia Commons bytes");
  const candidate = {
    id: "commons-sha1-test",
    bytes: bytes.length,
    commonsSha1: createHash("sha1").update(bytes).digest("hex"),
  };
  const verified = verifyCandidateBytes(candidate, bytes);
  assert.equal(verified.bytes, bytes.length);
  assert.equal(
    verified.sha256,
    createHash("sha256").update(bytes).digest("hex"),
  );
  assert.throws(
    () => verifyCandidateBytes(candidate, Buffer.from("corrupted Wikimedia Commons bytes")),
    /Commons size changed|Commons SHA-1 mismatch/,
  );
  const sameSizeCorruption = Buffer.from(bytes);
  sameSizeCorruption[0] ^= 0xff;
  assert.throws(
    () => verifyCandidateBytes(candidate, sameSizeCorruption),
    /Commons SHA-1 mismatch/,
  );
});

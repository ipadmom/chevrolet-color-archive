import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import test from "node:test";
import {
  parseArgs,
  titleFromSourcePage,
  titleKey,
} from "../scripts/stage-current-model-color-photo-queue.mjs";

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

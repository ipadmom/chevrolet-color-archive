#!/usr/bin/env node

import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  COMMONS_API,
  discoverCommonsCandidates,
} from "./commons.mjs";
import { downloadCandidate } from "./download.mjs";
import {
  markCandidateReview,
  mergeDiscovery,
  readManifest,
  recordIdFor,
  writeJsonAtomic,
} from "./manifest.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultManifest = path.join(
  scriptDirectory,
  "output",
  "review-manifest.json",
);

function usage() {
  return `Chevrolet photo candidate discovery

Commands:
  discover --model Camaro --year 1969 --color "Hugger Orange"
           [--make Chevrolet] [--generation 1967-1969] [--query QUERY ...]
           [--limit 12] [--manifest PATH] [--raw-dir PATH]

  review --record-id RECORD --candidate ID [--candidate ID ...]
         --status selected|rejected|pending [--note TEXT] [--manifest PATH]

  download --record-id RECORD (--selected | --candidate ID ...)
           [--output-dir PATH] [--max-bytes N] [--manifest PATH]

All photo candidates are illustrative only and are never factory-paint evidence.
Only candidates passing the conservative license allowlist can be downloaded.`;
}

function parseArguments(values) {
  const result = { _: [] };
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!value.startsWith("--")) {
      result._.push(value);
      continue;
    }
    const key = value.slice(2);
    if (key === "selected") {
      result.selected = true;
      continue;
    }
    const next = values[index + 1];
    if (next === undefined || next.startsWith("--")) {
      throw new Error(`Missing value for --${key}`);
    }
    index += 1;
    if (key === "query" || key === "candidate") {
      result[key] = [...(result[key] ?? []), next];
    } else {
      result[key] = next;
    }
  }
  return result;
}

function required(args, key) {
  const value = args[key];
  if (value === undefined || value === "") {
    throw new Error(`Missing required --${key}`);
  }
  return value;
}

function positiveInteger(value, fallback, label) {
  if (value === undefined) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive integer`);
  }
  return parsed;
}

function rawFileName(recordId, query, pageNumber) {
  const queryHash = createHash("sha256").update(query).digest("hex").slice(0, 12);
  const safeRecord = recordId.replaceAll("|", "--");
  return `${safeRecord}--${queryHash}--page-${String(pageNumber).padStart(
    3,
    "0",
  )}.json`;
}

async function discover(args) {
  const context = {
    make: args.make || "Chevrolet",
    model: required(args, "model"),
    year: required(args, "year"),
    color: required(args, "color"),
    generation: args.generation || null,
  };
  const recordId = recordIdFor(context);
  const manifestPath = path.resolve(args.manifest || defaultManifest);
  const rawDir = path.resolve(
    args["raw-dir"] || path.join(path.dirname(manifestPath), "raw"),
  );
  const limit = positiveInteger(args.limit, 12, "--limit");
  const queries =
    args.query?.length > 0
      ? args.query
      : [`${context.year} ${context.make} ${context.model} ${context.color}`];
  const manifest = await readManifest(manifestPath);
  const allCandidates = [];
  const rawResponseFiles = [];

  for (const query of queries) {
    const result = await discoverCommonsCandidates({
      query,
      context,
      limit,
      endpoint: args.endpoint || COMMONS_API,
      onRawResponse: async ({
        raw,
        pageNumber,
        requestUrl,
        retrievedAt,
      }) => {
        const filePath = path.join(
          rawDir,
          rawFileName(recordId, query, pageNumber),
        );
        await writeJsonAtomic(filePath, {
          requestUrl,
          retrievedAt,
          searchQuery: query,
          response: raw,
        });
        rawResponseFiles.push(path.relative(path.dirname(manifestPath), filePath));
        return path.relative(path.dirname(manifestPath), filePath);
      },
    });
    allCandidates.push(...result.candidates);
  }

  const record = mergeDiscovery({
    manifest,
    context,
    candidates: allCandidates,
    rawResponseFiles,
  });
  await writeJsonAtomic(manifestPath, manifest);
  return {
    command: "discover",
    manifestPath,
    recordId,
    queryCount: queries.length,
    candidatesReturned: allCandidates.length,
    candidatesAfterDedupe: record.candidates.length,
    rightsClear: record.candidates.filter(
      (candidate) => candidate.rights.downloadAllowed,
    ).length,
    rawResponses: rawResponseFiles.length,
  };
}

async function review(args) {
  const manifestPath = path.resolve(args.manifest || defaultManifest);
  const status = required(args, "status");
  if (!["selected", "rejected", "pending"].includes(status)) {
    throw new Error("--status must be selected, rejected, or pending");
  }
  const candidateIds = args.candidate ?? [];
  if (candidateIds.length === 0) {
    throw new Error("Provide at least one --candidate");
  }
  const manifest = await readManifest(manifestPath);
  markCandidateReview({
    manifest,
    recordId: required(args, "record-id"),
    candidateIds,
    status,
    note: args.note || null,
  });
  await writeJsonAtomic(manifestPath, manifest);
  return {
    command: "review",
    manifestPath,
    recordId: args["record-id"],
    candidateIds,
    status,
  };
}

async function download(args) {
  const manifestPath = path.resolve(args.manifest || defaultManifest);
  const recordId = required(args, "record-id");
  const manifest = await readManifest(manifestPath);
  const record = manifest.records.find((entry) => entry.recordId === recordId);
  if (!record) {
    throw new Error(`Record not found: ${recordId}`);
  }

  const candidateIds = args.selected
    ? record.review.selectedCandidateIds
    : args.candidate ?? [];
  if (candidateIds.length === 0) {
    throw new Error("No candidates chosen. Use --selected or --candidate ID.");
  }

  const outputDir = path.resolve(
    args["output-dir"] || path.join(path.dirname(manifestPath), "downloads"),
  );
  const maxBytes = positiveInteger(
    args["max-bytes"],
    50 * 1024 * 1024,
    "--max-bytes",
  );
  const byId = new Map(
    record.candidates.map((candidate) => [candidate.id, candidate]),
  );
  const results = [];
  for (const candidateId of [...new Set(candidateIds)].sort()) {
    const candidate = byId.get(candidateId);
    if (!candidate) {
      throw new Error(`Candidate not found in ${recordId}: ${candidateId}`);
    }
    results.push(
      await downloadCandidate({
        candidate,
        outputDir,
        maxBytes,
      }),
    );
  }

  return {
    command: "download",
    manifestPath,
    recordId,
    outputDir,
    results,
  };
}

export async function main(argv = process.argv.slice(2)) {
  const [command, ...values] = argv;
  if (!command || command === "help" || command === "--help") {
    process.stdout.write(`${usage()}\n`);
    return 0;
  }

  const args = parseArguments(values);
  let result;
  if (command === "discover") {
    result = await discover(args);
  } else if (command === "review") {
    result = await review(args);
  } else if (command === "download") {
    result = await download(args);
  } else {
    throw new Error(`Unknown command: ${command}\n\n${usage()}`);
  }
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}


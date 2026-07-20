#!/usr/bin/env node

/**
 * Build the Chevrolet Vehicle Information Kit link inventory from GM's
 * official Heritage Archive index.
 *
 * Usage:
 *   node scripts/update-gm-heritage-manifest.mjs \
 *     --retrieved-on 2026-07-20 \
 *     --verify-endpoints
 */

import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const INDEX_URL =
  "https://www.gm.com/heritage/archive/vehicle-information-kits";
const PDF_ORIGIN = "https://www.gm.com";
const PDF_PATH_PREFIX =
  "/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/";
const DEFAULT_OUTPUT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../data/sources/gm-heritage-chevrolet-kits.json",
);

const args = process.argv.slice(2);
const retrievedOn = readArgument("--retrieved-on") ?? utcDate();
const outputPath = path.resolve(readArgument("--output") ?? DEFAULT_OUTPUT);
const verifyEndpoints = args.includes("--verify-endpoints");

if (!/^\d{4}-\d{2}-\d{2}$/.test(retrievedOn)) {
  throw new Error("--retrieved-on must use YYYY-MM-DD.");
}

const indexResponse = await fetchWithRetry(INDEX_URL, {
  headers: { "user-agent": "ChevroletColorArchiveResearch/1.0" },
});
if (!indexResponse.ok) {
  throw new Error(
    `GM index request failed: HTTP ${indexResponse.status} ${indexResponse.statusText}`,
  );
}

const indexHtml = await indexResponse.text();
const rawEntries = extractChevroletPdfLinks(indexHtml);
if (rawEntries.length === 0) {
  throw new Error("No Chevrolet PDF links were found in the official GM index.");
}

const duplicateUrls = duplicates(rawEntries.map((entry) => entry.pdf_url));
const duplicateTitles = duplicates(rawEntries.map((entry) => entry.title));
if (duplicateUrls.length || duplicateTitles.length) {
  throw new Error(
    `Official index contains duplicates. URLs: ${duplicateUrls.length}; titles: ${duplicateTitles.length}.`,
  );
}

const endpointResults = verifyEndpoints
  ? await mapConcurrent(rawEntries, 8, probePdfEndpoint)
  : rawEntries.map(() => null);

const entries = rawEntries
  .map((entry, index) => ({
    ...entry,
    source_index_url: INDEX_URL,
    retrieved_on: retrievedOn,
    ...(endpointResults[index]
      ? {
          http: {
            status: endpointResults[index].status,
            content_type: endpointResults[index].content_type,
            content_length_bytes: endpointResults[index].content_length_bytes,
          },
        }
      : {}),
  }))
  .sort(compareEntries);

if (verifyEndpoints) {
  const badEndpoints = entries.filter(
    (entry) =>
      entry.http?.status !== 200 ||
      !/^application\/pdf(?:;|$)/i.test(entry.http?.content_type ?? ""),
  );
  if (badEndpoints.length) {
    throw new Error(
      `${badEndpoints.length} indexed PDF endpoints failed the HEAD audit.`,
    );
  }
}

const representedYears = [...new Set(entries.flatMap((entry) => entry.years))].sort(
  (a, b) => a - b,
);
const modelLabels = [...new Set(entries.map((entry) => entry.model_label))].sort(
  (a, b) => a.localeCompare(b, "en"),
);

const manifest = {
  schema_version: 1,
  visibility: "public",
  source_name: "GM Heritage Archive Vehicle Information Kits",
  source_index_url: INDEX_URL,
  retrieved_on: retrievedOn,
  scope:
    "Every link in the official index whose resolved URL is in the GM Chevrolet vehicle-information-kits PDF directory.",
  index_response: {
    sha256: createHash("sha256").update(indexHtml).digest("hex"),
    etag: indexResponse.headers.get("etag"),
    last_modified: indexResponse.headers.get("last-modified"),
  },
  summary: {
    entry_count: entries.length,
    represented_year_count: representedYears.length,
    first_year: representedYears[0],
    last_year: representedYears.at(-1),
    distinct_index_model_label_count: modelLabels.length,
  },
  endpoint_audit: verifyEndpoints
    ? {
        method: "HEAD",
        checked_on: retrievedOn,
        checked_count: entries.length,
        http_200_pdf_count: entries.length,
      }
    : null,
  entries,
};

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(
  `Wrote ${entries.length} Chevrolet kit records to ${outputPath}`,
);

function readArgument(name) {
  const index = args.indexOf(name);
  if (index === -1) return null;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${name} requires a value.`);
  }
  return value;
}

function utcDate() {
  return new Date().toISOString().slice(0, 10);
}

function decodeHtml(value) {
  return value
    .replace(/&#(\d+);/g, (_, decimal) =>
      String.fromCodePoint(Number(decimal)),
    )
    .replace(/&#x([0-9a-f]+);/gi, (_, hexadecimal) =>
      String.fromCodePoint(Number.parseInt(hexadecimal, 16)),
    )
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function cleanAnchorText(html) {
  return decodeHtml(html.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function extractChevroletPdfLinks(html) {
  const links = [];
  const anchorPattern = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;

  for (const match of html.matchAll(anchorPattern)) {
    const attributes = match[1];
    const hrefMatch = attributes.match(
      /\bhref\s*=\s*(?:"([^"]+)"|'([^']+)')/i,
    );
    const href = hrefMatch?.[1] ?? hrefMatch?.[2];
    if (!href) continue;

    const pdfUrl = new URL(decodeHtml(href), INDEX_URL);
    if (
      pdfUrl.origin !== PDF_ORIGIN ||
      !pdfUrl.pathname.startsWith(PDF_PATH_PREFIX) ||
      !pdfUrl.pathname.toLowerCase().endsWith(".pdf") ||
      pdfUrl.search ||
      pdfUrl.hash
    ) {
      continue;
    }

    const title = cleanAnchorText(match[2]);
    const leadingYears = title.match(
      /^(\d{4})(?:\s+And\s+(\d{4}))?\s+(.+)$/i,
    );
    if (!leadingYears) {
      throw new Error(`Could not parse indexed title: ${JSON.stringify(title)}`);
    }

    const years = [Number(leadingYears[1])];
    if (leadingYears[2]) years.push(Number(leadingYears[2]));

    links.push({
      year: years[0],
      years,
      title,
      model_label: leadingYears[3],
      pdf_url: pdfUrl.href,
    });
  }

  return links;
}

function duplicates(values) {
  const seen = new Set();
  const duplicateValues = new Set();
  for (const value of values) {
    if (seen.has(value)) duplicateValues.add(value);
    seen.add(value);
  }
  return [...duplicateValues].sort();
}

function compareEntries(a, b) {
  return (
    a.year - b.year ||
    a.title.localeCompare(b.title, "en") ||
    a.pdf_url.localeCompare(b.pdf_url, "en")
  );
}

async function probePdfEndpoint(entry) {
  const response = await fetchWithRetry(entry.pdf_url, {
    method: "HEAD",
    redirect: "follow",
    headers: { "user-agent": "ChevroletColorArchiveResearch/1.0" },
  });

  return {
    status: response.status,
    content_type: response.headers.get("content-type"),
    content_length_bytes:
      Number(response.headers.get("content-length")) || null,
  };
}

async function fetchWithRetry(url, options, attempts = 4) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fetch(url, options);
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await new Promise((resolve) =>
          setTimeout(resolve, 250 * 2 ** (attempt - 1)),
        );
      }
    }
  }
  throw new Error(
    `Request failed after ${attempts} attempts: ${url}`,
    { cause: lastError },
  );
}

async function mapConcurrent(items, concurrency, operation) {
  const output = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      output[index] = await operation(items[index], index);
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(concurrency, items.length) },
      () => worker(),
    ),
  );
  return output;
}

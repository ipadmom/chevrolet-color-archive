#!/usr/bin/env node

/**
 * Offline structural validation for the official GM Heritage Chevrolet
 * Vehicle Information Kit manifest.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const INDEX_URL =
  "https://www.gm.com/heritage/archive/vehicle-information-kits";
const PDF_ORIGIN = "https://www.gm.com";
const PDF_PATH_PREFIX =
  "/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/";
const DEFAULT_MANIFEST = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../data/sources/gm-heritage-chevrolet-kits.json",
);
const manifestPath = path.resolve(process.argv[2] ?? DEFAULT_MANIFEST);

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const errors = [];

check(manifest.schema_version === 1, "schema_version must be 1");
check(manifest.visibility === "public", "visibility must be public");
check(
  manifest.source_index_url === INDEX_URL,
  "source_index_url must be the official GM index",
);
check(
  /^\d{4}-\d{2}-\d{2}$/.test(manifest.retrieved_on ?? ""),
  "retrieved_on must use YYYY-MM-DD",
);
check(
  /^[0-9a-f]{64}$/.test(manifest.index_response?.sha256 ?? ""),
  "index_response.sha256 must be a lowercase SHA-256 digest",
);
check(Array.isArray(manifest.entries), "entries must be an array");

if (Array.isArray(manifest.entries)) {
  const urls = new Set();
  const titles = new Set();
  const representedYears = new Set();
  let previous = null;

  for (const [index, entry] of manifest.entries.entries()) {
    const label = `entries[${index}]`;
    check(
      Number.isInteger(entry.year),
      `${label}.year must be an integer`,
    );
    check(
      Array.isArray(entry.years) &&
        entry.years.length > 0 &&
        entry.years.every(Number.isInteger),
      `${label}.years must be a nonempty integer array`,
    );
    check(
      entry.years?.[0] === entry.year,
      `${label}.year must equal the first years value`,
    );
    check(
      entry.years?.every((year, yearIndex, years) =>
        yearIndex === 0 ? true : year > years[yearIndex - 1],
      ),
      `${label}.years must be strictly ascending`,
    );
    check(
      typeof entry.title === "string" && entry.title.length > 0,
      `${label}.title is required`,
    );
    check(
      typeof entry.model_label === "string" && entry.model_label.length > 0,
      `${label}.model_label is required`,
    );
    const titleParts = entry.title?.match(
      /^(\d{4})(?:\s+And\s+(\d{4}))?\s+(.+)$/i,
    );
    const titleYears = titleParts
      ? [Number(titleParts[1]), ...(titleParts[2] ? [Number(titleParts[2])] : [])]
      : [];
    check(Boolean(titleParts), `${label}.title must begin with its indexed year`);
    check(
      JSON.stringify(titleYears) === JSON.stringify(entry.years),
      `${label}.years must match the years preserved in title`,
    );
    check(
      titleParts?.[3] === entry.model_label,
      `${label}.model_label must preserve the title suffix verbatim`,
    );
    check(
      entry.source_index_url === INDEX_URL,
      `${label}.source_index_url must be the official GM index`,
    );
    check(
      entry.retrieved_on === manifest.retrieved_on,
      `${label}.retrieved_on must match the manifest`,
    );

    let pdfUrl;
    try {
      pdfUrl = new URL(entry.pdf_url);
    } catch {
      check(false, `${label}.pdf_url is not a valid URL`);
    }
    if (pdfUrl) {
      check(
        pdfUrl.origin === PDF_ORIGIN,
        `${label}.pdf_url must use the official GM origin`,
      );
      check(
        pdfUrl.pathname.startsWith(PDF_PATH_PREFIX),
        `${label}.pdf_url must use the official Chevrolet kit directory`,
      );
      check(
        pdfUrl.pathname.toLowerCase().endsWith(".pdf"),
        `${label}.pdf_url must end in .pdf`,
      );
      check(
        !pdfUrl.search && !pdfUrl.hash,
        `${label}.pdf_url must not contain a query or fragment`,
      );
    }

    check(!urls.has(entry.pdf_url), `${label}.pdf_url must be unique`);
    check(!titles.has(entry.title), `${label}.title must be unique`);
    urls.add(entry.pdf_url);
    titles.add(entry.title);
    for (const year of entry.years ?? []) representedYears.add(year);

    if (previous) {
      check(
        compareEntries(previous, entry) <= 0,
        `${label} is out of deterministic sort order`,
      );
    }
    previous = entry;

    if (manifest.endpoint_audit) {
      check(entry.http?.status === 200, `${label}.http.status must be 200`);
      check(
        /^application\/pdf(?:;|$)/i.test(entry.http?.content_type ?? ""),
        `${label}.http.content_type must be application/pdf`,
      );
      check(
        Number.isInteger(entry.http?.content_length_bytes) &&
          entry.http.content_length_bytes > 0,
        `${label}.http.content_length_bytes must be positive`,
      );
    }
  }

  check(
    manifest.summary?.entry_count === manifest.entries.length,
    "summary.entry_count must match entries.length",
  );
  check(
    manifest.summary?.represented_year_count === representedYears.size,
    "summary.represented_year_count must match entry years",
  );
  check(
    manifest.summary?.first_year === Math.min(...representedYears),
    "summary.first_year must match entry years",
  );
  check(
    manifest.summary?.last_year === Math.max(...representedYears),
    "summary.last_year must match entry years",
  );
  check(
    manifest.summary?.distinct_index_model_label_count ===
      new Set(manifest.entries.map((entry) => entry.model_label)).size,
    "summary.distinct_index_model_label_count must match entries",
  );

  if (manifest.endpoint_audit) {
    check(
      manifest.endpoint_audit.method === "HEAD",
      "endpoint_audit.method must be HEAD",
    );
    check(
      manifest.endpoint_audit.checked_count === manifest.entries.length,
      "endpoint_audit.checked_count must match entries.length",
    );
    check(
      manifest.endpoint_audit.http_200_pdf_count === manifest.entries.length,
      "endpoint_audit.http_200_pdf_count must match entries.length",
    );
    check(
      manifest.endpoint_audit.checked_on === manifest.retrieved_on,
      "endpoint_audit.checked_on must match retrieved_on",
    );
  }
}

if (errors.length) {
  console.error(`Manifest validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(
    `Manifest valid: ${manifest.entries.length} unique official Chevrolet PDF records, ${manifest.summary.represented_year_count} represented years.`,
  );
}

function check(condition, message) {
  if (!condition) errors.push(message);
}

function compareEntries(a, b) {
  return (
    a.year - b.year ||
    a.title.localeCompare(b.title, "en") ||
    a.pdf_url.localeCompare(b.pdf_url, "en")
  );
}
